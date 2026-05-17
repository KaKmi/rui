/**
 * JD 起草 — Human-in-the-loop 工具集。
 * 模型在调 generate_jd 之前，按需依次调用这些工具收集字段；
 * 这些工具没有 server execute，前端 widget 收集用户输入，addToolResult 回灌。
 */
export { askRole } from './ask-role';
export { askLevel } from './ask-level';
export { askLocation } from './ask-location';
export { askSalary } from './ask-salary';
export { askSkills } from './ask-skills';
export { askHeadcount } from './ask-headcount';
