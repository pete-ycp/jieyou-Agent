import type { inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '../../../api/router';

/** 从 tRPC 路由推断的前端业务类型（购物车与下单流程组专用） */
export type RouterOutputs = inferRouterOutputs<AppRouter>;

export type CartListItem = RouterOutputs['cart']['list'][number];
export type OrderSummary = RouterOutputs['order']['mine'][number];
export type OrderDetailData = RouterOutputs['order']['detail'];
export type OrderItemSnapshot = OrderDetailData['items'][number];
