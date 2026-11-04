import SwiftUI

struct SettingsRootView: View {
    private let conflictEngine: any ConflictEngine = StubConflictEngine()
    private let schedulingEngine: any SchedulingEngine = StubSchedulingEngine()
    private let legacyImporter: any LegacyBackupImporting = StubLegacyBackupImporter()

    var body: some View {
        Form {
            Section("备份与迁移") {
                Text("导出/导入 legacy fullBackup JSON（导入器为 stub）。")
                Text("Fixture: Resources/Fixtures/fullBackup.placeholder.json")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
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
    }
}

#Preview {
    SettingsRootView()
}
