import { Employee, WorkTime } from '@/types/employee';
import { WorkTimeStatus } from '@/types/enums';
import { createRepository } from '@/lib/data/repository-factory';
import { LocalStorageRepository } from '@/lib/data/localStorage-backend';

const employeeRepo = new LocalStorageRepository<Employee>('employees');
const workTimeRepo = new LocalStorageRepository<WorkTime>('work_times');

export const employeesRepository = {
  findAll: employeeRepo.findAll.bind(employeeRepo),
  findById: employeeRepo.findById.bind(employeeRepo),
  findMany: employeeRepo.findMany.bind(employeeRepo),
  create: employeeRepo.create.bind(employeeRepo),
  update: employeeRepo.update.bind(employeeRepo),
  delete: employeeRepo.delete.bind(employeeRepo),
  count: employeeRepo.count.bind(employeeRepo),
  bulkCreate: employeeRepo.bulkCreate.bind(employeeRepo),
  clear: employeeRepo.clear.bind(employeeRepo),

  async findActive(): Promise<Employee[]> {
    return employeeRepo.findMany((e) => e.is_active);
  },

  async findByLocation(locationId: string): Promise<Employee[]> {
    return employeeRepo.findMany(
      (e) => e.location_id === locationId && e.is_active
    );
  },

  async findByCode(employeeCode: string): Promise<Employee | null> {
    const results = await employeeRepo.findMany(
      (e) => e.employee_code === employeeCode
    );
    return results[0] ?? null;
  },

  async clockIn(employeeId: string, locationId: string): Promise<WorkTime> {
    return workTimeRepo.create({
      employee_id: employeeId,
      location_id: locationId,
      status: WorkTimeStatus.CLOCKED_IN,
      clock_in: new Date().toISOString(),
      total_break_minutes: 0,
    });
  },

  async clockOut(workTimeId: string): Promise<WorkTime> {
    const workTime = await workTimeRepo.findById(workTimeId);
    if (!workTime) throw new Error('Work time record not found');

    const clockOut = new Date();
    const clockIn = new Date(workTime.clock_in);
    const totalMinutes = Math.round(
      (clockOut.getTime() - clockIn.getTime()) / 60000
    );
    const totalWorkMinutes = totalMinutes - workTime.total_break_minutes;

    return workTimeRepo.update(workTimeId, {
      status: WorkTimeStatus.CLOCKED_OUT,
      clock_out: clockOut.toISOString(),
      total_work_minutes: totalWorkMinutes,
    });
  },

  async getActiveWorkTimes(): Promise<WorkTime[]> {
    return workTimeRepo.findMany(
      (wt) => wt.status === WorkTimeStatus.CLOCKED_IN || wt.status === WorkTimeStatus.ON_BREAK
    );
  },

  async getWorkTimesByEmployee(
    employeeId?: string,
    dateRange?: [string, string]
  ): Promise<WorkTime[]> {
    return workTimeRepo.findMany((wt) => {
      if (employeeId && wt.employee_id !== employeeId) return false;
      if (dateRange) {
        const clockIn = new Date(wt.clock_in);
        const from = new Date(dateRange[0]);
        const to = new Date(dateRange[1]);
        if (clockIn < from || clockIn > to) return false;
      }
      return true;
    });
  },

  async calculateDailyHours(employeeId: string, date: string): Promise<number> {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const workTimes = await workTimeRepo.findMany(
      (wt) =>
        wt.employee_id === employeeId &&
        new Date(wt.clock_in) >= dayStart &&
        new Date(wt.clock_in) <= dayEnd
    );

    return workTimes.reduce((total, wt) => {
      if (wt.total_work_minutes) {
        return total + wt.total_work_minutes / 60;
      }
      if (wt.status !== WorkTimeStatus.CLOCKED_OUT) {
        const now = new Date();
        const clockIn = new Date(wt.clock_in);
        const minutes = (now.getTime() - clockIn.getTime()) / 60000;
        return total + (minutes - wt.total_break_minutes) / 60;
      }
      return total;
    }, 0);
  },

  workTimes: workTimeRepo,
};
