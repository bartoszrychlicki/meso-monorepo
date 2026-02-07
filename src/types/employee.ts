import { EmploymentType, WorkTimeStatus } from './enums';
import { BaseEntity } from './common';

export interface Employee extends BaseEntity {
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  employee_code: string;
  pin: string;
  role: string;
  employment_type: EmploymentType;
  hourly_rate: number;
  overtime_rate?: number;
  location_id: string;
  is_active: boolean;
  avatar_url?: string;
}

export interface WorkTime extends BaseEntity {
  employee_id: string;
  location_id: string;
  status: WorkTimeStatus;
  clock_in: string;
  clock_out?: string;
  break_start?: string;
  break_end?: string;
  total_break_minutes: number;
  total_work_minutes?: number;
  notes?: string;
}
