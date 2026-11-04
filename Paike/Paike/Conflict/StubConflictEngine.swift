import Foundation

struct StubConflictEngine: ConflictEngine {
    func check(request: ConflictCheckRequest) async throws -> ConflictCheckResult {
        ConflictCheckResult(issues: [], checkedAt: .now)
    }
}
