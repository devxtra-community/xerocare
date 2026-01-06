import api from './api';

export interface Model {
    id: string;
    model_no: string;
    model_name: string;
    wholesale_price: number;
}

export interface CreateModelData {
    model_no: string;
    model_name: string;
    wholesale_price: number;
}

export interface UpdateModelData {
    model_no?: string;
    model_name?: string;
    wholesale_price?: number;
}

interface ApiResponse<T> {
    success: boolean;
    message: string;
    data?: T;
}

export const getAllModels = async (): Promise<Model[]> => {
    const response = await api.get<ApiResponse<Model[]>>('/i/models');
    return response.data.data || [];
};

export const addModel = async (data: CreateModelData): Promise<Model> => {
    const response = await api.post<ApiResponse<Model>>('/i/models', data);
    if (!response.data.data) {
        throw new Error('Failed to create model');
    }
    return response.data.data;
};

export const updateModel = async (id: string, data: UpdateModelData): Promise<void> => {
    await api.put<ApiResponse<void>>(`/i/models/${id}`, data);
};

export const deleteModel = async (id: string): Promise<void> => {
    await api.delete<ApiResponse<void>>(`/i/models/${id}`);
};
