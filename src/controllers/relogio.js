/** Relógio injetável: nos testes usamos uma data fixa. */
import { hojeISO } from '../utils/datas';

export const relogioReal = { hoje: () => hojeISO() };
