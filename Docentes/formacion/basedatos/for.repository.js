/*
Nombre completo: for.repository.js
Ruta o ubicación: formacion/basedatos/for.repository.js
Función o funciones: Centralizar el acceso a datos del módulo Formación y exponer operaciones ampliadas para lectura, guardado, conteo, verificación de existencia y soporte del flujo de exportación
*/

import { forReadRecords, forReadRecordById, forReadCatalogs } from "./for.data.read.js";
import {
  forSaveAllRecords,
  forUpsertRecord,
  forDeleteRecord,
  forEnsureSeedRecords
} from "./for.data.write.js";

export const forRepository = {
  async listRecords() {
    return forReadRecords();
  },

  async getRecordById(recordId) {
    return forReadRecordById(recordId);
  },

  async hasRecord(recordId) {
    const record = await forReadRecordById(recordId);
    return Boolean(record);
  },

  async countRecords() {
    const records = await forReadRecords();
    return Array.isArray(records) ? records.length : 0;
  },

  async listRecordIds() {
    const records = await forReadRecords();
    return Array.isArray(records) ? records.map(item => item.id).filter(Boolean) : [];
  },

  async saveRecord(record) {
    return forUpsertRecord(record);
  },

  async saveAll(records) {
    return forSaveAllRecords(records);
  },

  async deleteRecord(recordId) {
    return forDeleteRecord(recordId);
  },

  async ensureSeed(records = []) {
    return forEnsureSeedRecords(records);
  },

  async getCatalogs() {
    return forReadCatalogs();
  }
};