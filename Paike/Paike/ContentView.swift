import SwiftUI

enum AppSection: String, CaseIterable, Identifiable {
    case schedule = "课表"
    case catalog = "资料"
    case consumption = "课消"
    case statistics = "统计"
    case settings = "设置"

    var id: String { rawValue }

    var systemImage: String {
        switch self {
        case .schedule: "calendar"
        case .catalog: "books.vertical"
        case .consumption: "creditcard"
        case .statistics: "chart.bar"
        case .settings: "gearshape"
        }
    }
}

struct ContentView: View {
    @State private var selection: AppSection? = .schedule

    var body: some View {
        NavigationSplitView {
            List(AppSection.allCases, selection: $selection) { section in
                Label(section.rawValue, systemImage: section.systemImage)
                    .tag(section)
            }
            .navigationTitle("排课")
            #if os(macOS)
            .navigationSplitViewColumnWidth(min: 180, ideal: 200)
            #endif
        } detail: {
            Group {
                switch selection ?? .schedule {
                case .schedule:
                    ScheduleRootView()
                case .catalog:
                    CatalogRootView()
                case .consumption:
                    ConsumptionRootView()
                case .statistics:
                    StatisticsRootView()
                case .settings:
                    SettingsRootView()
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
    }
}

#Preview {
    ContentView()
}
