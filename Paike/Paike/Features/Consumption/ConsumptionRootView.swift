import SwiftData
import SwiftUI

struct ConsumptionRootView: View {
    @Query(sort: \LessonPackage.createdAt, order: .reverse) private var packages: [LessonPackage]

    var body: some View {
        ContentUnavailableView {
            Label("课消", systemImage: "creditcard")
        } description: {
            Text(packages.isEmpty
                ? "购课包、扣课时与流水将在此展示。"
                : "已记录 \(packages.count) 个课包（业务逻辑待实现）。")
        }
        .navigationTitle("课消")
    }
}

#Preview {
    ConsumptionRootView()
        .modelContainer(for: LessonPackage.self, inMemory: true)
}
