import api from "./api";

export interface Vendor {
    id: string;
    name: string;
    email: string;
    phone: string;
    address: string;
}

export async function createVendor(data: Partial<Vendor>) {
    const res = await api.post("/i/vendors/", data);
    return res.data;
}

export async function getVendors() {
    const res = await api.get("/i/vendors/");
    return res.data;
}

export async function getVendorById(id: string) {
    const res = await api.get(`/i/vendors/${id}`);
    return res.data;
}

export async function updateVendor(id: string, data: Partial<Vendor>) {
    const res = await api.patch(`/i/vendors/${id}`, data);
    return res.data;
}

export async function deleteVendor(id: string) {
    const res = await api.delete(`/i/vendors/${id}`);
    return res.data;
}
