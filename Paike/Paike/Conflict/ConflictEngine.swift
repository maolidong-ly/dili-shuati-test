import Foundation

struct ConflictIssue: Identifiable, Sendable {
    enum Severity: Sendable {
        case hard
        case soft
    }

    let id = UUID()
    let severity: Severity
    let message: String
    let scheduleTableLegacyID: String?
    let gridKey: String?
}

struct ConflictCheckRequest: Sendable {
    var scheduleTableLegacyIDs: [String]
    var includeGlobalCrossTable: Bool
}

struct ConflictCheckResult: Sendable {
    var issues: [ConflictIssue]
    var checkedAt: Date
}

protocol ConflictEngine: Sendable {
    func check(request: ConflictCheckRequest) async throws -> ConflictCheckResult
}
