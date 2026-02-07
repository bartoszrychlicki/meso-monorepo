'use client';

import { create } from 'zustand';
import { Employee, WorkTime } from '@/types/employee';
import { employeesRepository } from './repository';

interface EmployeeStore {
  employees: Employee[];
  activeWorkTimes: WorkTime[];
  workTimeLogs: WorkTime[];
  isLoading: boolean;
  // Actions
  loadEmployees: () => Promise<void>;
  createEmployee: (data: Omit<Employee, 'id' | 'created_at' | 'updated_at'>) => Promise<Employee>;
  updateEmployee: (id: string, data: Partial<Employee>) => Promise<void>;
  deactivateEmployee: (id: string) => Promise<void>;
  clockIn: (employeeId: string, locationId: string) => Promise<WorkTime>;
  clockOut: (workTimeId: string) => Promise<WorkTime>;
  loadActiveWorkTimes: () => Promise<void>;
  loadWorkTimeLogs: (employeeId?: string, dateRange?: [string, string]) => Promise<void>;
  // Computed
  getActiveEmployees: () => Employee[];
  getTodayTotalHours: () => number;
  getTodayLaborCost: () => number;
}

export const useEmployeeStore = create<EmployeeStore>()((set, get) => ({
  employees: [],
  activeWorkTimes: [],
  workTimeLogs: [],
  isLoading: false,

  loadEmployees: async () => {
    set({ isLoading: true });
    try {
      const result = await employeesRepository.findAll({ per_page: 100 });
      set({ employees: result.data });
    } finally {
      set({ isLoading: false });
    }
  },

  createEmployee: async (data) => {
    const employee = await employeesRepository.create(data);
    const { employees } = get();
    set({ employees: [...employees, employee] });
    return employee;
  },

  updateEmployee: async (id, data) => {
    await employeesRepository.update(id, data);
    const { employees } = get();
    set({
      employees: employees.map((e) =>
        e.id === id ? { ...e, ...data, updated_at: new Date().toISOString() } : e
      ),
    });
  },

  deactivateEmployee: async (id) => {
    await employeesRepository.update(id, { is_active: false });
    const { employees } = get();
    set({
      employees: employees.map((e) =>
        e.id === id ? { ...e, is_active: false } : e
      ),
    });
  },

  clockIn: async (employeeId, locationId) => {
    const workTime = await employeesRepository.clockIn(employeeId, locationId);
    const { activeWorkTimes } = get();
    set({ activeWorkTimes: [...activeWorkTimes, workTime] });
    return workTime;
  },

  clockOut: async (workTimeId) => {
    const workTime = await employeesRepository.clockOut(workTimeId);
    const { activeWorkTimes } = get();
    set({
      activeWorkTimes: activeWorkTimes.filter((wt) => wt.id !== workTimeId),
    });
    return workTime;
  },

  loadActiveWorkTimes: async () => {
    const activeWorkTimes = await employeesRepository.getActiveWorkTimes();
    set({ activeWorkTimes });
  },

  loadWorkTimeLogs: async (employeeId?, dateRange?) => {
    set({ isLoading: true });
    try {
      const workTimeLogs = await employeesRepository.getWorkTimesByEmployee(
        employeeId,
        dateRange
      );
      set({ workTimeLogs });
    } finally {
      set({ isLoading: false });
    }
  },

  getActiveEmployees: () => {
    return get().employees.filter((e) => e.is_active);
  },

  getTodayTotalHours: () => {
    const { activeWorkTimes, workTimeLogs } = get();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let totalMinutes = 0;

    // Completed shifts today
    workTimeLogs
      .filter((wt) => {
        const clockIn = new Date(wt.clock_in);
        return clockIn >= today && wt.total_work_minutes;
      })
      .forEach((wt) => {
        totalMinutes += wt.total_work_minutes || 0;
      });

    // Active shifts
    activeWorkTimes
      .filter((wt) => {
        const clockIn = new Date(wt.clock_in);
        return clockIn >= today;
      })
      .forEach((wt) => {
        const now = new Date();
        const clockIn = new Date(wt.clock_in);
        const minutes = (now.getTime() - clockIn.getTime()) / 60000;
        totalMinutes += minutes - wt.total_break_minutes;
      });

    return Math.round((totalMinutes / 60) * 10) / 10;
  },

  getTodayLaborCost: () => {
    const { employees, activeWorkTimes, workTimeLogs } = get();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let totalCost = 0;

    const getRate = (employeeId: string) => {
      const emp = employees.find((e) => e.id === employeeId);
      return emp?.hourly_rate ?? 0;
    };

    // Completed shifts today
    workTimeLogs
      .filter((wt) => {
        const clockIn = new Date(wt.clock_in);
        return clockIn >= today && wt.total_work_minutes;
      })
      .forEach((wt) => {
        const hours = (wt.total_work_minutes || 0) / 60;
        totalCost += hours * getRate(wt.employee_id);
      });

    // Active shifts
    activeWorkTimes
      .filter((wt) => {
        const clockIn = new Date(wt.clock_in);
        return clockIn >= today;
      })
      .forEach((wt) => {
        const now = new Date();
        const clockIn = new Date(wt.clock_in);
        const minutes = (now.getTime() - clockIn.getTime()) / 60000;
        const hours = (minutes - wt.total_break_minutes) / 60;
        totalCost += hours * getRate(wt.employee_id);
      });

    return Math.round(totalCost * 100) / 100;
  },
}));
