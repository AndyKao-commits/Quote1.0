// 本機資料儲存（localStorage）。下一版可換成 Lovable Cloud。

export type ProjectStatus = "pending" | "active" | "review" | "done";

export interface Project {
  id: string;
  name: string;
  customerName: string;
  customerPhone?: string;
  address: string;
  startDate: string; // YYYY-MM-DD
  expectedEndDate?: string;
  scope?: string; // 工程內容
  note?: string;
  status: ProjectStatus;
  createdAt: number;
}

export interface WorkLog {
  id: string;
  projectId: string;
  date: string;
  content: string;
  hours: number;
  workers: string;
  note?: string;
  createdAt: number;
}

export type PhotoCategory = "before" | "during" | "after";

export interface Photo {
  id: string;
  projectId: string;
  category: PhotoCategory;
  dataUrl: string; // 已加浮水印的圖
  takenAt: string; // YYYY-MM-DD HH:mm
  location?: string;
  note?: string;
  createdAt: number;
}

const K_PROJECTS = "swd_projects";
const K_LOGS = "swd_logs";
const K_PHOTOS = "swd_photos";

const isClient = () => typeof window !== "undefined";

function read<T>(key: string): T[] {
  if (!isClient()) return [];
  try {
    return JSON.parse(localStorage.getItem(key) || "[]") as T[];
  } catch {
    return [];
  }
}
function write<T>(key: string, value: T[]) {
  if (!isClient()) return;
  localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent("swd:change", { detail: { key } }));
}

export const uid = () =>
  `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

// Projects
export const listProjects = () =>
  read<Project>(K_PROJECTS).sort((a, b) => b.createdAt - a.createdAt);
export const getProject = (id: string) =>
  read<Project>(K_PROJECTS).find((p) => p.id === id);
export const saveProject = (p: Project) => {
  const list = read<Project>(K_PROJECTS);
  const idx = list.findIndex((x) => x.id === p.id);
  if (idx >= 0) list[idx] = p;
  else list.unshift(p);
  write(K_PROJECTS, list);
};
export const deleteProject = (id: string) => {
  write(K_PROJECTS, read<Project>(K_PROJECTS).filter((p) => p.id !== id));
  write(K_LOGS, read<WorkLog>(K_LOGS).filter((l) => l.projectId !== id));
  write(K_PHOTOS, read<Photo>(K_PHOTOS).filter((p) => p.projectId !== id));
};

// Logs
export const listLogs = (projectId: string) =>
  read<WorkLog>(K_LOGS)
    .filter((l) => l.projectId === projectId)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
export const saveLog = (l: WorkLog) => {
  const list = read<WorkLog>(K_LOGS);
  const idx = list.findIndex((x) => x.id === l.id);
  if (idx >= 0) list[idx] = l;
  else list.unshift(l);
  write(K_LOGS, list);
};
export const deleteLog = (id: string) => {
  write(K_LOGS, read<WorkLog>(K_LOGS).filter((l) => l.id !== id));
};

// Photos
export const listPhotos = (projectId: string) =>
  read<Photo>(K_PHOTOS)
    .filter((p) => p.projectId === projectId)
    .sort((a, b) => b.createdAt - a.createdAt);
export const savePhoto = (p: Photo) => {
  const list = read<Photo>(K_PHOTOS);
  list.unshift(p);
  write(K_PHOTOS, list);
};
export const deletePhoto = (id: string) => {
  write(K_PHOTOS, read<Photo>(K_PHOTOS).filter((p) => p.id !== id));
};

export const statusLabel = (s: ProjectStatus) =>
  ({ pending: "待施工", active: "施工中", review: "驗收中", done: "已完工" }[s]);
