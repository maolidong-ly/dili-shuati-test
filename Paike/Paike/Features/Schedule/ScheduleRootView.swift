import SwiftData
import SwiftUI

private let scheduleWeekDayLabels = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"]

struct ScheduleRootView: View {
    @Environment(\.modelContext) private var modelContext
    @Query(sort: \ScheduleTable.sortOrder) private var tables: [ScheduleTable]

    @State private var selectedLegacyID: String?
    @State private var editTarget: ScheduleCellEditTarget?

    var body: some View {
        Group {
            if tables.isEmpty {
                ContentUnavailableView {
                    Label("课表", systemImage: "calendar")
                } description: {
                    Text("尚无课表。在「设置」中导入 legacy fullBackup JSON。")
                }
            } else {
                VStack(alignment: .leading, spacing: 12) {
                    Picker("课表", selection: legacyIDBinding) {
                        ForEach(tables, id: \.legacyID) { table in
                            Text(table.name).tag(table.legacyID)
                        }
                    }
                    .pickerStyle(.menu)
                    .padding(.horizontal)

                    if let table = selectedTable {
                        ScheduleWeekGridView(table: table) { row, week in
                            editTarget = ScheduleCellEditTarget(
                                tableLegacyID: table.legacyID,
                                rowIndex: row,
                                weekIndex: week
                            )
                        }
                    }
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
            }
        }
        .navigationTitle("课表")
        .onAppear { syncSelectedTableID() }
        .onChange(of: tables.map(\.legacyID)) { _, _ in syncSelectedTableID() }
        .sheet(item: $editTarget) { target in
            if let table = tables.first(where: { $0.legacyID == target.tableLegacyID }) {
                ScheduleLessonCellEditSheet(
                    table: table,
                    rowIndex: target.rowIndex,
                    weekIndex: target.weekIndex
                )
            }
        }
    }

    private var selectedTable: ScheduleTable? {
        guard let id = selectedLegacyID else { return tables.first }
        return tables.first { $0.legacyID == id } ?? tables.first
    }

    private var legacyIDBinding: Binding<String> {
        Binding(
            get: { selectedLegacyID ?? tables.first?.legacyID ?? "" },
            set: { selectedLegacyID = $0 }
        )
    }

    private func syncSelectedTableID() {
        guard !tables.isEmpty else {
            selectedLegacyID = nil
            return
        }
        if let current = selectedLegacyID,
           tables.contains(where: { $0.legacyID == current }) {
            return
        }
        if let preferred = UserDefaults.standard.string(forKey: LegacyBackupImporter.currentTableUserDefaultsKey),
           tables.contains(where: { $0.legacyID == preferred }) {
            selectedLegacyID = preferred
        } else {
            selectedLegacyID = tables.first?.legacyID
        }
    }
}

private struct ScheduleCellEditTarget: Identifiable {
    var id: String { "\(tableLegacyID)-\(rowIndex)-\(weekIndex)" }
    let tableLegacyID: String
    let rowIndex: Int
    let weekIndex: Int
}

private struct ScheduleWeekGridView: View {
    let table: ScheduleTable
    let onCellTap: (Int, Int) -> Void

    private var timeRows: [ConflictTimeRow] {
        ConflictTimeParsing.decodeTimeListJSON(table.timeListJSON)
    }

    private var rowIndices: [Int] {
        if !timeRows.isEmpty {
            return Array(timeRows.indices)
        }
        guard let maxRow = table.lessonCells.map(\.rowIndex).max(), maxRow >= 0 else {
            return []
        }
        return Array(0 ... maxRow)
    }

    var body: some View {
        ScrollView([.horizontal, .vertical]) {
            Grid(alignment: .leading, horizontalSpacing: 1, verticalSpacing: 1) {
                GridRow {
                    Text("节次")
                        .font(.caption.bold())
                        .frame(width: 120, alignment: .leading)
                        .padding(6)
                    ForEach(0 ..< 7, id: \.self) { week in
                        Text(scheduleWeekDayLabels[week])
                            .font(.caption.bold())
                            .frame(minWidth: 88, alignment: .center)
                            .padding(6)
                    }
                }
                .background(Color.primary.opacity(0.06))

                ForEach(rowIndices, id: \.self) { row in
                    if row < timeRows.count, timeRows[row].isSplit {
                        GridRow {
                            Text(timeRows[row].name)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .padding(6)
                                .gridCellColumns(8)
                        }
                        .background(Color.primary.opacity(0.04))
                    } else {
                        GridRow {
                            Text(rowLabel(for: row))
                                .font(.caption)
                                .frame(width: 120, alignment: .leading)
                                .padding(6)
                            ForEach(0 ..< 7, id: \.self) { week in
                                ScheduleGridCellView(cell: lessonCell(row: row, week: week)) {
                                    onCellTap(row, week)
                                }
                            }
                        }
                    }
                }
            }
            .padding()
        }
    }

    private func rowLabel(for row: Int) -> String {
        if row < timeRows.count {
            return timeRows[row].name
        }
        return "第 \(row + 1) 节"
    }

    private func lessonCell(row: Int, week: Int) -> LessonCell? {
        table.lessonCells.first { $0.rowIndex == row && $0.weekIndex == week }
    }
}

private struct ScheduleGridCellView: View {
    let cell: LessonCell?
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            VStack(alignment: .leading, spacing: 2) {
                Text(displayCourseName)
                    .font(.caption)
                    .foregroundStyle(.primary)
                    .lineLimit(2)
                    .multilineTextAlignment(.leading)
                if let subtitle = secondaryLine {
                    Text(subtitle)
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }
            }
            .frame(minWidth: 88, minHeight: 52, alignment: .topLeading)
            .padding(6)
            .background(Color.primary.opacity(cell == nil ? 0.02 : 0.05))
            .overlay {
                RoundedRectangle(cornerRadius: 4)
                    .strokeBorder(Color.primary.opacity(0.12))
            }
        }
        .buttonStyle(.plain)
    }

    private var displayCourseName: String {
        guard let name = cell?.courseName.trimmingCharacters(in: .whitespacesAndNewlines),
              !name.isEmpty else {
            return "—"
        }
        return name
    }

    private var secondaryLine: String? {
        guard let cell else { return nil }
        let parts = [cell.teacherName, cell.roomName].filter {
            !$0.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        }
        return parts.isEmpty ? nil : parts.joined(separator: " · ")
    }
}

private struct ScheduleLessonCellEditSheet: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss

    let table: ScheduleTable
    let rowIndex: Int
    let weekIndex: Int

    private let conflictEngine: any ConflictEngine = DefaultConflictEngine()

    @State private var courseName: String
    @State private var conflictLines: [String] = []
    @State private var errorMessage: String?
    @State private var isChecking = false

    init(table: ScheduleTable, rowIndex: Int, weekIndex: Int) {
        self.table = table
        self.rowIndex = rowIndex
        self.weekIndex = weekIndex
        let existing = table.lessonCells.first { $0.rowIndex == rowIndex && $0.weekIndex == weekIndex }
        _courseName = State(initialValue: existing?.courseName ?? "")
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    LabeledContent("位置") {
                        Text("\(scheduleWeekDayLabels[weekIndex]) · 第 \(rowIndex + 1) 行")
                    }
                    TextField("课程名称", text: $courseName)
                }
                if !conflictLines.isEmpty {
                    Section("冲突检测") {
                        ForEach(conflictLines, id: \.self) { line in
                            Text(line)
                                .font(.footnote)
                        }
                    }
                }
            }
            .formStyle(.grouped)
            .navigationTitle("编辑课时")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("取消") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("保存") {
                        Task { await saveWithConflictCheck() }
                    }
                    .disabled(isChecking)
                }
            }
            .alert("无法保存", isPresented: Binding(
                get: { errorMessage != nil },
                set: { if !$0 { errorMessage = nil } }
            )) {
                Button("好", role: .cancel) {}
            } message: {
                Text(errorMessage ?? "")
            }
        }
        #if os(macOS)
        .frame(minWidth: 360, minHeight: 280)
        #endif
    }

    @MainActor
    private func saveWithConflictCheck() async {
        isChecking = true
        defer { isChecking = false }

        let cell = resolvedCell()
        let previousName = cell.courseName
        cell.courseName = courseName.trimmingCharacters(in: .whitespacesAndNewlines)
        table.updatedAt = .now

        do {
            let snapshots = try ConflictScheduleSnapshotBuilder.fetchAllSnapshots(context: modelContext)
            let request = ConflictCheckRequest.make(
                tables: snapshots,
                scope: .singleTable,
                scheduleTableLegacyIDs: [table.legacyID],
                includeGlobalCrossTable: table.checkGlobal
            )
            let result = try await conflictEngine.check(request: request)
            conflictLines = result.issues.map { issue in
                let prefix = issue.severity == .hard ? "错误" : "警告"
                return "\(prefix)：\(issue.message)"
            }

            if result.hardIssues.isEmpty {
                try modelContext.save()
                dismiss()
            } else {
                cell.courseName = previousName
                errorMessage = "存在 \(result.hardIssues.count) 个硬冲突，请修改后再保存。"
            }
        } catch {
            cell.courseName = previousName
            errorMessage = error.localizedDescription
        }
    }

    private func resolvedCell() -> LessonCell {
        if let existing = table.lessonCells.first(where: { $0.rowIndex == rowIndex && $0.weekIndex == weekIndex }) {
            return existing
        }
        let cell = LessonCell(rowIndex: rowIndex, weekIndex: weekIndex, scheduleTable: table)
        modelContext.insert(cell)
        return cell
    }
}

#Preview {
    ScheduleRootView()
        .modelContainer(for: PaikeSchemaV1.models, inMemory: true)
}
