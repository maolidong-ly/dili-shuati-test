import Foundation
import SwiftData

@Model
final class ConsumptionLedger {
    var deltaHours: Double
    var note: String
    var recordedAt: Date

    var package: LessonPackage?

    init(deltaHours: Double, note: String = "", recordedAt: Date = .now, package: LessonPackage? = nil) {
        self.deltaHours = deltaHours
        self.note = note
        self.recordedAt = recordedAt
        self.package = package
    }
}
