import Foundation
import SwiftData

@Model
final class LessonPackage {
    var studentOrClassLabel: String
    var courseName: String
    var purchasedHours: Double
    var remainingHours: Double
    var lowBalanceThreshold: Double
    var createdAt: Date

    @Relationship(deleteRule: .cascade, inverse: \ConsumptionLedger.package)
    var ledgerEntries: [ConsumptionLedger] = []

    init(
        studentOrClassLabel: String,
        courseName: String,
        purchasedHours: Double,
        remainingHours: Double? = nil,
        lowBalanceThreshold: Double = 4,
        createdAt: Date = .now
    ) {
        self.studentOrClassLabel = studentOrClassLabel
        self.courseName = courseName
        self.purchasedHours = purchasedHours
        self.remainingHours = remainingHours ?? purchasedHours
        self.lowBalanceThreshold = lowBalanceThreshold
        self.createdAt = createdAt
    }
}
