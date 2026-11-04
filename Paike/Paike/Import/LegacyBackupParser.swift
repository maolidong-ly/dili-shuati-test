import Foundation

struct LegacyParsedTimeRow: Codable, Sendable, Equatable {
    var name: String
    var isSplit: Bool
}

struct LegacyParsedScheduleTable: Sendable, Equatable {
    var id: String
    var name: String
    var bindClass: String
    var periodTemplateRef: String
    var timeList: [LegacyParsedTimeRow]
    var cells: [LegacyParsedLessonCell]
    var onlyEmpty: Bool
    var checkGlobal: Bool
    var spreadWeek: Bool
}

struct LegacyParsedLessonCell: Sendable, Equatable {
    var rowIndex: Int
    var weekIndex: Int
    var courseName: String
    var teacherName: String
    var roomName: String
    var className: String
    var customStart: String?
    var customEnd: String?
}

struct LegacyParsedClassEntry: Sendable, Equatable {
    var name: String
    var grade: String
}

struct LegacyParsedCourseOffering: Sendable, Equatable {
    var name: String
    var teacherName: String
    var roomName: String
    var className: String
}

struct LegacyParsedTimeTemplate: Sendable, Equatable {
    var name: String
    var timeList: [LegacyParsedTimeRow]
    var isHiddenBuiltin: Bool
}

struct LegacyParsedFullBackup: Sendable, Equatable {
    var metadata: LegacyFullBackupMetadata
    var tables: [LegacyParsedScheduleTable]
    var classes: [LegacyParsedClassEntry]
    var teachers: [String]
    var rooms: [String]
    var courses: [LegacyParsedCourseOffering]
    var templates: [LegacyParsedTimeTemplate]
    var classTemplatePrefs: [String: String]
}

enum LegacyBackupParser {
    static func parse(data: Data) throws -> LegacyParsedFullBackup {
        let object = try JSONSerialization.jsonObject(with: data)
        guard let dict = object as? [String: Any] else {
            throw LegacyImportError.decodingFailed("root is not an object")
        }
        guard let backupType = dict["backupType"] as? String else {
            throw LegacyImportError.decodingFailed("missing backupType")
        }
        guard backupType == "fullBackup" else {
            throw LegacyImportError.invalidBackupType(backupType)
        }

        let metadata = LegacyFullBackupMetadata(
            backupType: backupType,
            backupTime: dict["backupTime"] as? String,
            currentTableID: dict["currentTableId"] as? String,
            appName: dict["appName"] as? String
        )

        let tableArray = try decodeJSONArray(from: dict["multiTableData"] ?? dict["tableList"], field: "multiTableData")
        let classArray = try decodeJSONArray(from: dict["classList"], field: "classList")
        let teacherArray = try decodeJSONArray(from: dict["teacherList"], field: "teacherList")
        let roomArray = try decodeJSONArray(from: dict["roomList"], field: "roomList")
        let courseArray = try decodeJSONArray(from: dict["courseList"], field: "courseList")
        let templateArray = try decodeJSONArray(from: dict["timeTemplateList"], field: "timeTemplateList")
        let hiddenNames = try decodeStringArray(from: dict["timeTemplateHiddenNames"], field: "timeTemplateHiddenNames")
        let hiddenSet = Set(hiddenNames)
        let classPrefs = try decodeStringDictionary(from: dict["classTemplatePrefs"], field: "classTemplatePrefs")

        let tables = try tableArray.enumerated().map { index, item in
            try parseScheduleTable(item, sortIndex: index, backup: dict)
        }
        let classes = try classArray.map { try parseClassEntry($0) }
        let teachers = try teacherArray.map { try parseStringEntry($0, field: "teacherList") }
        let rooms = try roomArray.map { try parseStringEntry($0, field: "roomList") }
        let courses = try courseArray.map { try parseCourseOffering($0) }
        let templates = try templateArray.map { item in
            try parseTimeTemplate(item, hiddenSet: hiddenSet)
        }

        var repairedCourses = courses
        repairCourseList(from: tables, into: &repairedCourses)

        return LegacyParsedFullBackup(
            metadata: metadata,
            tables: tables,
            classes: classes,
            teachers: teachers,
            rooms: rooms,
            courses: repairedCourses,
            templates: templates,
            classTemplatePrefs: classPrefs
        )
    }

    static func summary(for backup: LegacyParsedFullBackup) -> LegacyImportSummary {
        LegacyImportSummary(
            tableCount: backup.tables.count,
            classCount: backup.classes.count,
            teacherCount: backup.teachers.count,
            roomCount: backup.rooms.count,
            courseCount: backup.courses.count,
            templateCount: backup.templates.count
        )
    }

    // MARK: - Repair (legacy `repairCourseListFromAllTables`)

    static func repairCourseList(from tables: [LegacyParsedScheduleTable], into courses: inout [LegacyParsedCourseOffering]) {
        var seen = Set(courses.map { courseDedupeKey($0) })
        for table in tables {
            for cell in table.cells where !cell.courseName.isEmpty {
                let offering = LegacyParsedCourseOffering(
                    name: cell.courseName,
                    teacherName: cell.teacherName,
                    roomName: cell.roomName,
                    className: cell.className.isEmpty ? table.bindClass : cell.className
                )
                let key = courseDedupeKey(offering)
                guard !seen.contains(key) else { continue }
                seen.insert(key)
                courses.append(offering)
            }
        }
    }

    static func courseDedupeKey(_ course: LegacyParsedCourseOffering) -> String {
        "\(course.name)|\(course.className)"
    }

    // MARK: - Private decoding

    private static func decodeJSONArray(from value: Any?, field: String) throws -> [Any] {
        guard let value else { return [] }
        if let array = value as? [Any] { return array }
        if let string = value as? String, let data = string.data(using: .utf8) {
            let decoded = try JSONSerialization.jsonObject(with: data)
            guard let array = decoded as? [Any] else {
                throw LegacyImportError.decodingFailed("\(field) string is not a JSON array")
            }
            return array
        }
        throw LegacyImportError.decodingFailed("\(field) is not an array or JSON string")
    }

    private static func decodeStringArray(from value: Any?, field: String) throws -> [String] {
        let array = try decodeJSONArray(from: value, field: field)
        return try array.map { try parseStringEntry($0, field: field) }
    }

    private static func decodeStringDictionary(from value: Any?, field: String) throws -> [String: String] {
        guard let value else { return [:] }
        if let dict = value as? [String: String] { return dict }
        if let dict = value as? [String: Any] {
            var result: [String: String] = [:]
            for (key, raw) in dict {
                if let string = raw as? String {
                    result[key] = string
                }
            }
            return result
        }
        if let string = value as? String, let data = string.data(using: .utf8) {
            let decoded = try JSONSerialization.jsonObject(with: data)
            guard let dict = decoded as? [String: Any] else {
                throw LegacyImportError.decodingFailed("\(field) string is not a JSON object")
            }
            return try decodeStringDictionary(from: dict, field: field)
        }
        throw LegacyImportError.decodingFailed("\(field) is not an object or JSON string")
    }

    private static func parseStringEntry(_ value: Any, field: String) throws -> String {
        if let string = value as? String { return string }
        throw LegacyImportError.decodingFailed("\(field) entry is not a string")
    }

    private static func parseClassEntry(_ value: Any) throws -> LegacyParsedClassEntry {
        if let string = value as? String {
            return LegacyParsedClassEntry(name: string, grade: "")
        }
        guard let dict = value as? [String: Any], let name = dict["name"] as? String else {
            throw LegacyImportError.decodingFailed("classList entry missing name")
        }
        let grade = dict["grade"] as? String ?? ""
        return LegacyParsedClassEntry(name: name, grade: grade)
    }

    private static func parseCourseOffering(_ value: Any) throws -> LegacyParsedCourseOffering {
        guard let dict = value as? [String: Any], let name = dict["name"] as? String else {
            throw LegacyImportError.decodingFailed("courseList entry missing name")
        }
        return LegacyParsedCourseOffering(
            name: name,
            teacherName: dict["teacher"] as? String ?? "",
            roomName: dict["room"] as? String ?? "",
            className: dict["cls"] as? String ?? ""
        )
    }

    private static func parseTimeTemplate(_ value: Any, hiddenSet: Set<String>) throws -> LegacyParsedTimeTemplate {
        guard let dict = value as? [String: Any], let name = dict["name"] as? String else {
            throw LegacyImportError.decodingFailed("timeTemplateList entry missing name")
        }
        let timeListRaw = try decodeJSONArray(from: dict["timeList"], field: "timeList")
        let timeList = try timeListRaw.map { try parseTimeRow($0) }
        return LegacyParsedTimeTemplate(name: name, timeList: timeList, isHiddenBuiltin: hiddenSet.contains(name))
    }

    private static func parseScheduleTable(_ value: Any, sortIndex: Int, backup: [String: Any]) throws -> LegacyParsedScheduleTable {
        guard let dict = value as? [String: Any] else {
            throw LegacyImportError.decodingFailed("multiTableData entry is not an object")
        }
        let id = dict["id"] as? String ?? "table_import_\(sortIndex)"
        let name = dict["name"] as? String ?? "课表 \(sortIndex + 1)"
        var bindClass = dict["bindClass"] as? String ?? ""
        if bindClass.isEmpty {
            bindClass = name
        }
        var periodTemplateRef = dict["periodTemplateRef"] as? String ?? "default"
        var timeListRaw = try decodeJSONArray(from: dict["timeList"], field: "timeList")
        var timeList = try timeListRaw.map { try parseTimeRow($0) }
        if timeList.isEmpty {
            timeList = pickFallbackTimeList(from: backup, templateRef: periodTemplateRef)
        }
        if timeList.isEmpty, periodTemplateRef.isEmpty {
            periodTemplateRef = "default"
        }

        let dataDict: [String: String]
        if let rawData = dict["data"] as? [String: Any] {
            dataDict = rawData.compactMapValues { $0 as? String }
        } else if let rawString = dict["data"] as? String, let data = rawString.data(using: .utf8),
                  let decoded = try JSONSerialization.jsonObject(with: data) as? [String: Any] {
            dataDict = decoded.compactMapValues { $0 as? String }
        } else {
            dataDict = [:]
        }

        let cells = dataDict.compactMap { key, value -> LegacyParsedLessonCell? in
            parseLessonCell(key: key, value: value)
        }

        var onlyEmpty = true
        var checkGlobal = true
        var spreadWeek = true
        if let autoConfig = dict["autoScheduleConfig"] as? [String: Any],
           let settings = autoConfig["settings"] as? [String: Any] {
            if let onlyEmptyValue = settings["onlyEmpty"] as? Bool { onlyEmpty = onlyEmptyValue }
            if let checkGlobalValue = settings["checkGlobal"] as? Bool { checkGlobal = checkGlobalValue }
            if let spreadWeekValue = settings["spreadWeek"] as? Bool { spreadWeek = spreadWeekValue }
        }

        return LegacyParsedScheduleTable(
            id: id,
            name: name,
            bindClass: bindClass,
            periodTemplateRef: periodTemplateRef,
            timeList: timeList,
            cells: cells,
            onlyEmpty: onlyEmpty,
            checkGlobal: checkGlobal,
            spreadWeek: spreadWeek
        )
    }

    private static func pickFallbackTimeList(from backup: [String: Any], templateRef: String) -> [LegacyParsedTimeRow] {
        guard let templateArray = try? decodeJSONArray(from: backup["timeTemplateList"], field: "timeTemplateList") else {
            return []
        }
        for item in templateArray {
            guard let dict = item as? [String: Any], let name = dict["name"] as? String, name == templateRef else {
                continue
            }
            if let timeListRaw = try? decodeJSONArray(from: dict["timeList"], field: "timeList") {
                return (try? timeListRaw.compactMap { try? parseTimeRow($0) }) ?? []
            }
        }
        return []
    }

    private static func parseTimeRow(_ value: Any) throws -> LegacyParsedTimeRow {
        guard let dict = value as? [String: Any], let name = dict["name"] as? String else {
            throw LegacyImportError.decodingFailed("timeList row missing name")
        }
        let isSplit = dict["isSplit"] as? Bool ?? false
        return LegacyParsedTimeRow(name: name, isSplit: isSplit)
    }

    static func parseLessonCell(key: String, value: String) -> LegacyParsedLessonCell? {
        let parts = key.split(separator: "-", omittingEmptySubsequences: false)
        guard parts.count == 2,
              let rowIndex = Int(parts[0]),
              let weekIndex = Int(parts[1]) else {
            return nil
        }
        let segments = value.split(separator: "|", omittingEmptySubsequences: false).map(String.init)
        guard segments.count == 4 || segments.count == 6 else { return nil }
        var customStart: String?
        var customEnd: String?
        if segments.count == 6 {
            customStart = segments[4]
            customEnd = segments[5]
        }
        return LegacyParsedLessonCell(
            rowIndex: rowIndex,
            weekIndex: weekIndex,
            courseName: segments[0],
            teacherName: segments[1],
            roomName: segments[2],
            className: segments[3],
            customStart: customStart,
            customEnd: customEnd
        )
    }

    static func encodeTimeListJSON(_ rows: [LegacyParsedTimeRow]) throws -> String {
        let data = try JSONEncoder().encode(rows)
        guard let string = String(data: data, encoding: .utf8) else {
            throw LegacyImportError.decodingFailed("timeList JSON encoding failed")
        }
        return string
    }
}
