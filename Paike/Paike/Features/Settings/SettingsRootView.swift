import SwiftUI
import SwiftData
import UniformTypeIdentifiers

struct SettingsRootView: View {
    @Environment(\.modelContext) private var modelContext

    private let conflictEngine: any ConflictEngine = DefaultConflictEngine()
    private let schedulingEngine: any SchedulingEngine = StubSchedulingEngine()
    private let legacyImporter: any LegacyBackupImporting = LegacyBackupImporter()

    @State private var isImportingFile = false
    @State private var pendingImportData: Data?
    @State private var importPreview: LegacyImportSummary?
    @State private var importMetadata: LegacyFullBackupMetadata?
    @State private var showImportConfirmation = false
    @State private var statusMessage: String?
    @State private var errorMessage: String?
    @State private var isWorking = false

    var body: some View {
        Form {
            Section("备份与迁移") {
                Text("从 legacy 桌面版导出的 fullBackup JSON 恢复课表与基础资料。")
                Button("选择备份 JSON…") {
                    isImportingFile = true
                }
                .disabled(isWorking)

                if let statusMessage {
                    Text(statusMessage)
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
            }
            Section("引擎") {
                LabeledContent("ConflictEngine", value: String(describing: type(of: conflictEngine)))
                LabeledContent("SchedulingEngine", value: String(describing: type(of: schedulingEngine)))
                LabeledContent("Legacy import", value: String(describing: type(of: legacyImporter)))
            }
            Section("功能开关") {
                LabeledContent("iCloud", value: FeatureFlags.iCloudSyncEnabled ? "开" : "关")
                LabeledContent("高级排课约束", value: FeatureFlags.advancedSchedulingConstraints ? "开" : "关")
            }
        }
        .formStyle(.grouped)
        .navigationTitle("设置")
        .fileImporter(
            isPresented: $isImportingFile,
            allowedContentTypes: [.json],
            allowsMultipleSelection: false
        ) { result in
            switch result {
            case .success(let urls):
                guard let url = urls.first else { return }
                Task { await loadPreview(from: url) }
            case .failure(let error):
                errorMessage = error.localizedDescription
            }
        }
        .alert("导入 legacy 备份？", isPresented: $showImportConfirmation) {
            Button("取消", role: .cancel) {
                pendingImportData = nil
                importPreview = nil
                importMetadata = nil
            }
            Button("导入", role: .destructive) {
                Task { await confirmImport() }
            }
        } message: {
            if let importPreview {
                Text(importConfirmationMessage(summary: importPreview))
            }
        }
        .alert("导入失败", isPresented: Binding(
            get: { errorMessage != nil },
            set: { if !$0 { errorMessage = nil } }
        )) {
            Button("好", role: .cancel) {}
        } message: {
            Text(errorMessage ?? "")
        }
    }

    private func importConfirmationMessage(summary: LegacyImportSummary) -> String {
        var lines = [
            "课表 \(summary.tableCount) 张",
            "班级 \(summary.classCount)",
            "教师 \(summary.teacherCount)",
            "教室 \(summary.roomCount)",
            "课程 \(summary.courseCount)",
            "课时模版 \(summary.templateCount)",
        ]
        if let backupTime = importMetadata?.backupTime {
            lines.insert("备份时间：\(backupTime)", at: 0)
        }
        lines.append("将替换现有课表与基础资料（课消记录保留）。")
        return lines.joined(separator: "\n")
    }

    @MainActor
    private func loadPreview(from url: URL) async {
        isWorking = true
        defer { isWorking = false }
        do {
            let accessed = url.startAccessingSecurityScopedResource()
            defer {
                if accessed { url.stopAccessingSecurityScopedResource() }
            }
            let data = try Data(contentsOf: url)
            let (metadata, summary) = try await legacyImporter.preview(data: data)
            pendingImportData = data
            importMetadata = metadata
            importPreview = summary
            showImportConfirmation = true
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    @MainActor
    private func confirmImport() async {
        guard let data = pendingImportData else { return }
        isWorking = true
        defer {
            isWorking = false
            pendingImportData = nil
            importPreview = nil
            importMetadata = nil
        }
        do {
            let summary = try await legacyImporter.importFullBackup(data: data, context: modelContext)
            let snapshots = try ConflictScheduleSnapshotBuilder.fetchAllSnapshots(context: modelContext)
            let conflictRequest = ConflictCheckRequest.make(
                tables: snapshots,
                scope: .allTables,
                scheduleTableLegacyIDs: snapshots.map(\.legacyID),
                includeGlobalCrossTable: true
            )
            let conflictResult = try await conflictEngine.check(request: conflictRequest)
            var message = "已导入：课表 \(summary.tableCount) 张，课程 \(summary.courseCount) 条。"
            if conflictResult.hardIssues.isEmpty {
                message += " 冲突检测：无硬冲突。"
            } else {
                message += " 冲突检测：\(conflictResult.hardIssues.count) 个硬冲突。"
            }
            if !conflictResult.softIssues.isEmpty {
                message += " \(conflictResult.softIssues.count) 条警告。"
            }
            statusMessage = message
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

#Preview {
    SettingsRootView()
        .modelContainer(for: PaikeSchemaV1.models, inMemory: true)
}
