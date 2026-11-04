import SwiftData
import SwiftUI

struct ScheduleRootView: View {
    @Query(sort: \ScheduleTable.sortOrder) private var tables: [ScheduleTable]

    var body: some View {
        ContentUnavailableView {
            Label("课表", systemImage: "calendar")
        } description: {
            if tables.isEmpty {
                Text("尚无课表。后续在此编辑周视图与冲突提示。")
            } else {
                Text("已加载 \(tables.count) 张课表（数据模型就绪，UI 待实现）。")
            }
        }
        .navigationTitle("课表")
    }
}

#Preview {
    ScheduleRootView()
        .modelContainer(for: ScheduleTable.self, inMemory: true)
}
