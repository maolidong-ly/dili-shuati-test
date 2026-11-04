import Foundation

struct ConflictTimeRow: Sendable, Equatable {
    var name: String
    var isSplit: Bool
}

struct ConflictClockInterval: Sendable, Equatable {
    var startMinutes: Int
    var endMinutes: Int

    func overlaps(_ other: ConflictClockInterval) -> Bool {
        startMinutes < other.endMinutes && other.startMinutes < endMinutes
    }
}

enum ConflictTimeParsing {
    private static let clockRangePattern = #/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/#

    static func decodeTimeListJSON(_ json: String) -> [ConflictTimeRow] {
        guard let data = json.data(using: .utf8),
              let rows = try? JSONDecoder().decode([ConflictTimeRow].self, from: data) else {
            return []
        }
        return rows
    }

    static func parseClock(_ text: String) -> Int? {
        let parts = text.split(separator: ":", omittingEmptySubsequences: false)
        guard parts.count == 2,
              let hour = Int(parts[0]),
              let minute = Int(parts[1]),
              (0 ... 23).contains(hour),
              (0 ... 59).contains(minute) else {
            return nil
        }
        return hour * 60 + minute
    }

    static func intervalFromTimeListName(_ name: String) -> ConflictClockInterval? {
        guard let match = name.firstMatch(of: clockRangePattern) else { return nil }
        guard let startHour = Int(match.1),
              let startMinute = Int(match.2),
              let endHour = Int(match.3),
              let endMinute = Int(match.4) else {
            return nil
        }
        let start = startHour * 60 + startMinute
        let end = endHour * 60 + endMinute
        guard end > start else { return nil }
        return ConflictClockInterval(startMinutes: start, endMinutes: end)
    }

    static func interval(
        for cell: ConflictLessonCellSnapshot,
        timeList: [ConflictTimeRow]
    ) -> ConflictClockInterval? {
        if let startText = cell.customStart,
           let endText = cell.customEnd,
           let start = parseClock(startText),
           let end = parseClock(endText),
           end > start {
            return ConflictClockInterval(startMinutes: start, endMinutes: end)
        }
        guard cell.rowIndex >= 0, cell.rowIndex < timeList.count else { return nil }
        let row = timeList[cell.rowIndex]
        if row.isSplit { return nil }
        return intervalFromTimeListName(row.name)
    }
}

extension ConflictTimeRow: Codable {}
