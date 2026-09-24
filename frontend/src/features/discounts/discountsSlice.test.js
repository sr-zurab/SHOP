import {
  describe,
  expect,
  it,
  vi,
  beforeEach,
} from 'vitest';

vi.mock('../../api/authFetch', () => ({
  authFetch: vi.fn(),
  parseJsonOrThrow: vi.fn(),
}));

import {
  calculateDiscounts,
  fetchManagerDiscounts,
  createManagerDiscount,
  updateManagerDiscount,
  deleteManagerDiscount,
  clearCalculation,
  clearManagerError,
  default as discountsReducer,
} from './discountsSlice';

import {
  authFetch,
  parseJsonOrThrow,
} from '../../api/authFetch';


describe('discountsSlice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });


  it('имеет правильное начальное состояние', () => {
    const state = discountsReducer(
      undefined,
      { type: '@@INIT' }
    );

    expect(state).toEqual({
      calculation: null,
      items: [],
      loading: false,
      error: null,
      managerLoading: false,
      managerError: null,
    });
  });


  it('обрабатывает успешный расчёт скидки', async () => {
    const calculation = {
      subtotal: '2500.00',
      discount_total: '250.00',
      total: '2250.00',
      applied_discounts: [
        {
          id: 1,
          name: 'Скидка 10%',
          discount_type: 'percent',
          value: '10.00',
          amount: '250.00',
        },
      ],
    };

    authFetch.mockResolvedValue({
      ok: true,
    });

    parseJsonOrThrow.mockResolvedValue(
      calculation
    );

    const dispatch = vi.fn();

    const thunk = calculateDiscounts([3, 7]);

    const result = await thunk(
      dispatch,
      () => ({}),
      undefined
    );

    expect(result.type).toBe(
      'discounts/calculate/fulfilled'
    );

    expect(authFetch).toHaveBeenCalledWith(
      '/discounts/calculate/',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          item_ids: [3, 7],
        }),
      }
    );

    expect(
      parseJsonOrThrow
    ).toHaveBeenCalledWith(
      {
        ok: true,
      },
      'Ошибка расчёта скидки'
    );

    expect(result.payload).toEqual(
      calculation
    );
  });


  it('обрабатывает ошибку расчёта скидки', async () => {
    authFetch.mockRejectedValue(
      new Error('Ошибка сервера')
    );

    const dispatch = vi.fn();

    const thunk = calculateDiscounts([3]);

    const result = await thunk(
      dispatch,
      () => ({}),
      undefined
    );

    expect(result.type).toBe(
      'discounts/calculate/rejected'
    );

    expect(result.payload).toBe(
      'Ошибка сервера'
    );
  });


  it('переводит состояние в loading при pending', () => {
    const state = discountsReducer(
      undefined,
      calculateDiscounts.pending(
        'request-1',
        [3]
      )
    );

    expect(state.loading).toBe(true);
    expect(state.error).toBeNull();
  });


  it('сохраняет результат расчёта при fulfilled', () => {
    const calculation = {
      subtotal: '2000.00',
      discount_total: '200.00',
      total: '1800.00',
      applied_discounts: [],
    };

    const state = discountsReducer(
      undefined,
      calculateDiscounts.fulfilled(
        calculation,
        'request-1',
        [3]
      )
    );

    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
    expect(state.calculation).toEqual(
      calculation
    );
  });


  it('сохраняет ошибку при rejected', () => {
    const state = discountsReducer(
      undefined,
      calculateDiscounts.rejected(
        new Error('Ошибка сервера'),
        'request-1',
        [3],
        'Ошибка сервера'
      )
    );

    expect(state.loading).toBe(false);
    expect(state.error).toBe(
      'Ошибка сервера'
    );
  });


  it('очищает расчёт скидки', () => {
    const previousState = {
      calculation: {
        subtotal: '2000.00',
        discount_total: '200.00',
        total: '1800.00',
        applied_discounts: [],
      },
      items: [],
      loading: false,
      error: 'Старая ошибка',
      managerLoading: false,
      managerError: null,
    };

    const state = discountsReducer(
      previousState,
      clearCalculation()
    );

    expect(state).toEqual({
      calculation: null,
      items: [],
      loading: false,
      error: null,
      managerLoading: false,
      managerError: null,
    });
  });


  it('загружает скидки менеджера', async () => {
    const discounts = [
      {
        id: 1,
        name: 'Скидка 10%',
        products: [3],
      },
      {
        id: 2,
        name: 'Скидка 20%',
        products: [7],
      },
    ];

    authFetch.mockResolvedValue({
      ok: true,
    });

    parseJsonOrThrow.mockResolvedValue(
      discounts
    );

    const dispatch = vi.fn();

    const thunk = fetchManagerDiscounts();

    const result = await thunk(
      dispatch,
      () => ({}),
      undefined
    );

    expect(result.type).toBe(
      'discounts/fetchManagerDiscounts/fulfilled'
    );

    expect(authFetch).toHaveBeenCalledWith(
      '/discounts/'
    );

    expect(result.payload).toEqual(
      discounts
    );
  });


  it('сохраняет загруженные скидки', () => {
    const discounts = [
      {
        id: 1,
        name: 'Скидка 10%',
        products: [3],
      },
    ];

    const state = discountsReducer(
      undefined,
      fetchManagerDiscounts.fulfilled(
        discounts,
        'request-1'
      )
    );

    expect(state.managerLoading).toBe(false);
    expect(state.managerError).toBeNull();
    expect(state.items).toEqual(
      discounts
    );
  });


  it('создаёт скидку менеджера', async () => {
    const discountData = {
      name: 'Скидка на товар',
      description: 'Тестовая скидка',
      discount_type: 'percent',
      value: '15.00',
      status: 'active',
      starts_at: '2026-09-23T00:00:00Z',
      ends_at: '2026-10-01T00:00:00Z',
      products: [3],
    };

    const createdDiscount = {
      id: 10,
      ...discountData,
    };

    authFetch.mockResolvedValue({
      ok: true,
    });

    parseJsonOrThrow.mockResolvedValue(
      createdDiscount
    );

    const dispatch = vi.fn();

    const thunk = createManagerDiscount(
      discountData
    );

    const result = await thunk(
      dispatch,
      () => ({}),
      undefined
    );

    expect(result.type).toBe(
      'discounts/createManagerDiscount/fulfilled'
    );

    expect(authFetch).toHaveBeenCalledWith(
      '/discounts/',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(
          discountData
        ),
      }
    );

    expect(result.payload).toEqual(
      createdDiscount
    );
  });


  it('добавляет созданную скидку в список', () => {
    const createdDiscount = {
      id: 10,
      name: 'Новая скидка',
      products: [3],
    };

    const previousState = {
      calculation: null,
      items: [
        {
          id: 1,
          name: 'Старая скидка',
          products: [5],
        },
      ],
      loading: false,
      error: null,
      managerLoading: true,
      managerError: null,
    };

    const state = discountsReducer(
      previousState,
      createManagerDiscount.fulfilled(
        createdDiscount,
        'request-1',
        {}
      )
    );

    expect(state.managerLoading).toBe(false);
    expect(state.managerError).toBeNull();
    expect(state.items).toEqual([
      {
        id: 1,
        name: 'Старая скидка',
        products: [5],
      },
      createdDiscount,
    ]);
  });


  it('обновляет скидку менеджера', async () => {
    const data = {
      name: 'Обновлённая скидка',
      value: '25.00',
      products: [3, 7],
    };

    const updatedDiscount = {
      id: 10,
      ...data,
    };

    authFetch.mockResolvedValue({
      ok: true,
    });

    parseJsonOrThrow.mockResolvedValue(
      updatedDiscount
    );

    const dispatch = vi.fn();

    const thunk = updateManagerDiscount({
      id: 10,
      data,
    });

    const result = await thunk(
      dispatch,
      () => ({}),
      undefined
    );

    expect(result.type).toBe(
      'discounts/updateManagerDiscount/fulfilled'
    );

    expect(authFetch).toHaveBeenCalledWith(
      '/discounts/10/',
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      }
    );

    expect(result.payload).toEqual(
      updatedDiscount
    );
  });


  it('заменяет обновлённую скидку в списке', () => {
    const updatedDiscount = {
      id: 10,
      name: 'Обновлённая скидка',
      value: '25.00',
      products: [3, 7],
    };

    const previousState = {
      calculation: null,
      items: [
        {
          id: 10,
          name: 'Старая скидка',
          value: '10.00',
          products: [3],
        },
        {
          id: 20,
          name: 'Другая скидка',
          products: [5],
        },
      ],
      loading: false,
      error: null,
      managerLoading: true,
      managerError: null,
    };

    const state = discountsReducer(
      previousState,
      updateManagerDiscount.fulfilled(
        updatedDiscount,
        'request-1',
        {
          id: 10,
          data: updatedDiscount,
        }
      )
    );

    expect(state.managerLoading).toBe(false);
    expect(state.managerError).toBeNull();
    expect(state.items).toEqual([
      updatedDiscount,
      {
        id: 20,
        name: 'Другая скидка',
        products: [5],
      },
    ]);
  });


  it('удаляет скидку менеджера', async () => {
    authFetch.mockResolvedValue({
      ok: true,
    });

    const dispatch = vi.fn();

    const thunk = deleteManagerDiscount(10);

    const result = await thunk(
      dispatch,
      () => ({}),
      undefined
    );

    expect(result.type).toBe(
      'discounts/deleteManagerDiscount/fulfilled'
    );

    expect(authFetch).toHaveBeenCalledWith(
      '/discounts/10/',
      {
        method: 'DELETE',
      }
    );

    expect(result.payload).toBe(10);
  });


  it('удаляет скидку из списка', () => {
    const previousState = {
      calculation: null,
      items: [
        {
          id: 10,
          name: 'Удаляемая скидка',
        },
        {
          id: 20,
          name: 'Оставшаяся скидка',
        },
      ],
      loading: false,
      error: null,
      managerLoading: true,
      managerError: null,
    };

    const state = discountsReducer(
      previousState,
      deleteManagerDiscount.fulfilled(
        10,
        'request-1',
        10
      )
    );

    expect(state.managerLoading).toBe(false);
    expect(state.managerError).toBeNull();
    expect(state.items).toEqual([
      {
        id: 20,
        name: 'Оставшаяся скидка',
      },
    ]);
  });


  it('обрабатывает ошибку менеджерского запроса', () => {
    const state = discountsReducer(
      undefined,
      fetchManagerDiscounts.rejected(
        new Error('Нет доступа'),
        'request-1',
        undefined,
        'Нет доступа'
      )
    );

    expect(state.managerLoading).toBe(false);
    expect(state.managerError).toBe(
      'Нет доступа'
    );
  });


  it('очищает ошибку менеджера', () => {
    const previousState = {
      calculation: null,
      items: [],
      loading: false,
      error: null,
      managerLoading: false,
      managerError: 'Ошибка',
    };

    const state = discountsReducer(
      previousState,
      clearManagerError()
    );

    expect(state.managerError).toBeNull();
  });
});