import AddEmployeeDialog from "./components/AddEmployeeDialog";
import UserTable from "./components/UserTable";


export type UserListItem = {
    id: number;
    name: string;
    department: string;
    branch: string;
    startDate: string;
    visaexpiryDate: string;
    salary: number;
};


async function getUsers(): Promise<UserListItem[]> {
    // 🔹 TEMP mock — backend will replace this
    return [
        {
            id: 1,
            name: "Seving Aslanova",
            department: "Marketing",
            branch: "Kochi",
            startDate: "19.02.2023",
            visaexpiryDate: "19.02.2025",
            salary: 1250
        },
        {
            id: 2,
            name: "Mark Lue",
            department: "Finance",
            branch: "Ernakulam",
            startDate: "19.05.2023",
            visaexpiryDate: "19.05.2025",
            salary: 750
        },
        {
            id: 3,
            name: "Mark Lue",
            department: "Finance",
            branch: "Ernakulam",
            startDate: "19.05.2023",
            visaexpiryDate: "19.05.2025",
            salary: 6000
        },
        {
            id: 4,
            name: "Mark Lue",
            department: "Finance",
            branch: "Ernakulam",
            startDate: "19.05.2023",
            visaexpiryDate: "19.05.2025",
            salary: 1500
        },
        {
            id: 5,
            name: "Mark Lue",
            department: "Finance",
            branch: "Ernakulam",
            startDate: "19.05.2023",
            visaexpiryDate: "19.05.2025",
            salary: 800
        },
        {
            id: 6,
            name: "Mark Lue",
            department: "Finance",
            branch: "Ernakulam",
            startDate: "19.05.2023",
            visaexpiryDate: "19.05.2025",
            salary: 7000
        },
        {
            id: 7,
            name: "Mark Lue",
            department: "Finance",
            branch: "Ernakulam",
            startDate: "19.05.2023",
            visaexpiryDate: "19.05.2025",
            salary: 1000
        },
        {
            id: 8,
            name: "Mark Lue",
            department: "Finance",
            branch: "Ernakulam",
            startDate: "19.05.2023",
            visaexpiryDate: "19.05.2025",
            salary: 5000
        },
        {
            id: 9,
            name: "Mark Lue",
            department: "Finance",
            branch: "Ernakulam",
            startDate: "19.05.2023",
            visaexpiryDate: "19.05.2025",
            salary: 4000
        },
        {
            id: 10,
            name: "Mark Lue",
            department: "Finance",
            branch: "Ernakulam",
            startDate: "19.05.2023",
            visaexpiryDate: "19.05.2025",
            salary: 6000
        },
        {
            id: 11,
            name: "Mark Lue",
            department: "Finance",
            branch: "Ernakulam",
            startDate: "19.05.2023",
            visaexpiryDate: "19.05.2025",
            salary: 2500    
        },
    ];
}

export default async function UsersPage() {
    const users = await getUsers();

    return (
        <div className="space-y-6">
            {/*HEADER*/}

            <div className ="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                <h1 className="sm:text-3xl font-serif">Human Resources</h1>
                <AddEmployeeDialog />
            </div>

            <UserTable users={users} />
        </div>
    )
}
