import SwiftData
import SwiftUI

struct CatalogRootView: View {
    @Query(sort: \ClassInfo.sortOrder) private var classes: [ClassInfo]
    @Query(sort: \Teacher.sortOrder) private var teachers: [Teacher]
    @Query(sort: \Room.sortOrder) private var rooms: [Room]
    @Query(sort: \CourseOffering.sortOrder) private var courses: [CourseOffering]

    var body: some View {
        List {
            Section("班级") {
                Text(classes.isEmpty ? "暂无" : "\(classes.count) 个班级")
            }
            Section("教师") {
                Text(teachers.isEmpty ? "暂无" : "\(teachers.count) 位教师")
            }
            Section("教室") {
                Text(rooms.isEmpty ? "暂无" : "\(rooms.count) 间教室")
            }
            Section("课程") {
                Text(courses.isEmpty ? "暂无" : "\(courses.count) 条课程")
            }
        }
        .navigationTitle("资料")
    }
}

#Preview {
    CatalogRootView()
        .modelContainer(for: ClassInfo.self, inMemory: true)
}
