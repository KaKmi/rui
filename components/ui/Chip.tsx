import * as React from 'react';
import { Badge, type BadgeProps } from './Badge';

/**
 * 原型 `ui.jsx` 里的 Chip 与 Badge 同形；为兼容旧调用名保留导出，
 * 内部直接复用 Badge，不维护两套类名。
 */
export const Chip = (props: BadgeProps) => <Badge {...props} />;
