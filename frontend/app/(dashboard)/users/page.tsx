import AddEmployeeDialog from "./components/AddEmployeeDialog";
import UserTable from "./components/UserTable";

export default function UsersPage(){
    return(
        <div className="space-y-6">
            {/*HEADER*/}

            <div className="flex items-center justify-between">
                <h1 className="text-xl font-semibold">Human Resources</h1>
                <AddEmployeeDialog/>
            </div>

            {/*TABLE*/}
        <UserTable/>
        </div>
    )
}
