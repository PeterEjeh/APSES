import client from './client';

export const getClearanceForm = (projectId) =>
  client.get(`/clearance/project/${projectId}`).then((r) => r.data);

export const saveClearanceForm = (projectId, data) =>
  client.put(`/clearance/project/${projectId}`, data).then((r) => r.data);
