import SwiftData
import SwiftUI

@main
struct PaikeApp: App {
    var sharedModelContainer: ModelContainer = {
        let schema = Schema(PaikeSchemaV1.models)
        let configuration = ModelConfiguration(isStoredInMemoryOnly: false)
        do {
            return try ModelContainer(for: schema, configurations: [configuration])
        } catch {
            fatalError("Could not create ModelContainer: \(error)")
        }
    }()

    var body: some Scene {
        WindowGroup {
            ContentView()
        }
        .modelContainer(sharedModelContainer)
    }
}
