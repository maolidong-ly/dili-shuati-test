import SwiftUI

struct StatisticsRootView: View {
    var body: some View {
        ContentUnavailableView {
            Label("统计", systemImage: "chart.bar")
        } description: {
            Text("节次工作量与课消口径汇总（待实现）。")
        }
        .navigationTitle("统计")
    }
}

#Preview {
    StatisticsRootView()
}
