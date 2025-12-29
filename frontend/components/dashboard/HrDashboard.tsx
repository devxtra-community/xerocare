export type UserListItem = {
    id: number;
    name: string;
    department: string;
    branch: string;
    startDate: string;
    expiryDate: string;
    salary: string;
};

// async function getUsers(): Promise<UserListItem[]> {
//     // 🔹 TEMP mock — backend will replace this
//     return [
//         {
//             id: 1,
//             name: "Seving Aslanova",
//             department: "Marketing",
//             branch: "Kochi",
//             startDate: "19.02.2023",
//             expiryDate: "19.02.2025",
//             salary: "1200 AZN"
//         },
//         {
//             id: 2,
//             name: "Mark Lue",
//             department: "Finance",
//             branch: "Ernakulam",
//             startDate: "19.05.2023",
//             expiryDate: "19.05.2025",
//             salary: "1500 AZN"
//         },
//         {
//             id: 3,
//             name: "Mark Lue",
//             department: "Finance",
//             branch: "Ernakulam",
//             startDate: "19.05.2023",
//             expiryDate: "19.05.2025",
//             salary: "1500 AZN"
//         },
//         {
//             id: 4,
//             name: "Mark Lue",
//             department: "Finance",
//             branch: "Ernakulam",
//             startDate: "19.05.2023",
//             expiryDate: "19.05.2025",
//             salary: "1500 AZN"
//         },
//         {
//             id: 5,
//             name: "Mark Lue",
//             department: "Finance",
//             branch: "Ernakulam",
//             startDate: "19.05.2023",
//             expiryDate: "19.05.2025",
//             salary: "1500 AZN"
//         },
//         {
//             id: 6,
//             name: "Mark Lue",
//             department: "Finance",
//             branch: "Ernakulam",
//             startDate: "19.05.2023",
//             expiryDate: "19.05.2025",
//             salary: "1500 AZN"
//         },
//         {
//             id: 7,
//             name: "Mark Lue",
//             department: "Finance",
//             branch: "Ernakulam",
//             startDate: "19.05.2023",
//             expiryDate: "19.05.2025",
//             salary: "1500 AZN"
//         },
//         {
//             id: 8,
//             name: "Mark Lue",
//             department: "Finance",
//             branch: "Ernakulam",
//             startDate: "19.05.2023",
//             expiryDate: "19.05.2025",
//             salary: "1500 AZN"
//         },
//         {
//             id: 9,
//             name: "Mark Lue",
//             department: "Finance",
//             branch: "Ernakulam",
//             startDate: "19.05.2023",
//             expiryDate: "19.05.2025",
//             salary: "1500 AZN"
//         },
//         {
//             id: 10,
//             name: "Mark Lue",
//             department: "Finance",
//             branch: "Ernakulam",
//             startDate: "19.05.2023",
//             expiryDate: "19.05.2025",
//             salary: "1500 AZN"
//         },
//         {
//             id: 11,
//             name: "Mark Lue",
//             department: "Finance",
//             branch: "Ernakulam",
//             startDate: "19.05.2023",
//             expiryDate: "19.05.2025",
//             salary: "1500 AZN"
//         },
//     ];
// }

export default function HrDashboard() {
    return (
        <div className="space-y-6">
            {/*HEADER*/}

            <div className="flex items-center justify-between p-6">
                <h1 className="mb-4 text-3xl font-serif">Human Resources</h1>
                {/* <AddEmployeeDialog /> */}
            </div>

            {/* <UserTable users={users} /> */}
        </div>
    )
}