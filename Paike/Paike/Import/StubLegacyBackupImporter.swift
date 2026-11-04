import Foundation
import SwiftData

/// Kept for previews/tests that must not touch SwiftData.
struct StubLegacyBackupImporter: LegacyBackupImporting {
    func preview(data: Data) async throws -> (LegacyFullBackupMetadata, LegacyImportSummary) {
        let parsed = try LegacyBackupParser.parse(data: data)
        return (parsed.metadata, LegacyBackupParser.summary(for: parsed))
    }

    func importFullBackup(data: Data, context: ModelContext) async throws -> LegacyImportSummary {
        _ = context
        return try await preview(data: data).1
    }
}
