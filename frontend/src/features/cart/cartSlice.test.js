import { describe, expect, it } from 'vitest';
import reducer, {
  stockUpdated,
} from './cartSlice';

describe('cartSlice', () => {
  it('имеет начальное состояние', () => {
    const state = reducer(undefined, {
      type: '@@INIT',
    });

    expect(state).toEqual({
      data: {
        items: [],
        total_price: 0,
      },
      loading: false,
      error: null,
    });
  });

  it('обновляет остаток обычного товара через stockUpdated', () => {
    const initialState = {
      data: {
        items: [
          {
            id: 1,
            product: {
              id: 10,
              stock: 5,
              available: true,
            },
            quantity: 2,
            attribute_stock: 5,
            selected_attributes: {},
          },
        ],
        total_price: 100,
      },
      loading: false,
      error: null,
    };

    const state = reducer(
      initialState,
      stockUpdated({
        product_id: 10,
        stock: 2,
        available: true,
        has_attributes: false,
      })
    );

    expect(
      state.data.items[0].product.stock
    ).toBe(2);

    expect(
      state.data.items[0].product.available
    ).toBe(true);

    expect(
      state.data.items[0].attribute_stock
    ).toBe(2);
  });

  it('обновляет остаток выбранного атрибута', () => {
    const initialState = {
      data: {
        items: [
          {
            id: 1,
            product: {
              id: 10,
              stock: 10,
              available: true,
              has_attributes: true,
              attributes: [],
            },
            quantity: 2,
            attribute_stock: 5,
            selected_attributes: {
              Цвет: 'Красный',
            },
          },
        ],
        total_price: 100,
      },
      loading: false,
      error: null,
    };

    const state = reducer(
      initialState,
      stockUpdated({
        product_id: 10,
        stock: 8,
        available: true,
        has_attributes: true,
        attributes: [
          {
            id: 1,
            name: 'Цвет',
            value: 'Красный',
            stock: 3,
            available: true,
            in_stock: true,
          },
        ],
      })
    );

    expect(
      state.data.items[0].attribute_stock
    ).toBe(3);

    expect(
      state.data.items[0].product.stock
    ).toBe(8);

    expect(
      state.data.items[0].product.available
    ).toBe(true);
  });

  it('устанавливает остаток 0 для недоступного выбранного атрибута', () => {
    const initialState = {
      data: {
        items: [
          {
            id: 1,
            product: {
              id: 10,
              stock: 10,
              available: true,
              has_attributes: true,
            },
            quantity: 2,
            attribute_stock: 5,
            selected_attributes: {
              Цвет: 'Красный',
            },
          },
        ],
        total_price: 100,
      },
      loading: false,
      error: null,
    };

    const state = reducer(
      initialState,
      stockUpdated({
        product_id: 10,
        stock: 8,
        available: true,
        has_attributes: true,
        attributes: [
          {
            id: 1,
            name: 'Цвет',
            value: 'Красный',
            stock: 0,
            available: false,
            in_stock: false,
          },
        ],
      })
    );

    expect(
      state.data.items[0].attribute_stock
    ).toBe(0);
  });

  it('не изменяет товар другого product_id', () => {
    const initialState = {
      data: {
        items: [
          {
            id: 1,
            product: {
              id: 10,
              stock: 5,
              available: true,
            },
            quantity: 2,
            attribute_stock: 5,
            selected_attributes: {},
          },
        ],
        total_price: 100,
      },
      loading: false,
      error: null,
    };

    const state = reducer(
      initialState,
      stockUpdated({
        product_id: 20,
        stock: 1,
        available: false,
        has_attributes: false,
      })
    );

    expect(
      state.data.items[0].product.stock
    ).toBe(5);

    expect(
      state.data.items[0].product.available
    ).toBe(true);

    expect(
      state.data.items[0].attribute_stock
    ).toBe(5);
  });

  it('обновляет остаток только у соответствующего варианта одного товара', () => {
    const initialState = {
      data: {
        items: [
          {
            id: 94,
            product: {
              id: 6,
              stock: 0,
              available: true,
              has_attributes: true,
              attributes: [],
            },
            quantity: 2,
            attribute_stock: 2,
            selected_attributes: {
              диагональ: "60''",
            },
          },
          {
            id: 95,
            product: {
              id: 6,
              stock: 0,
              available: true,
              has_attributes: true,
              attributes: [],
            },
            quantity: 1,
            attribute_stock: 1,
            selected_attributes: {
              диагональ: "65''",
            },
          },
        ],
        total_price: 150000,
      },
      loading: false,
      error: null,
    };

    const state = reducer(
      initialState,
      stockUpdated({
        product_id: 6,
        stock: 0,
        available: true,
        has_attributes: true,
        attributes: [
          {
            id: 1,
            name: 'диагональ',
            value: "60''",
            stock: 0,
            available: true,
            in_stock: false,
          },
          {
            id: 2,
            name: 'диагональ',
            value: "65''",
            stock: 1,
            available: true,
            in_stock: true,
          },
        ],
      })
    );

    expect(
      state.data.items[0].attribute_stock
    ).toBe(0);

    expect(
      state.data.items[1].attribute_stock
    ).toBe(1);
  });

  it('не считает вариант недоступным, если product.stock равен 0, но остаток атрибута положительный', () => {
    const initialState = {
      data: {
        items: [
          {
            id: 94,
            product: {
              id: 6,
              stock: 0,
              available: true,
              has_attributes: true,
              attributes: [],
            },
            quantity: 2,
            attribute_stock: 2,
            selected_attributes: {
              диагональ: "60''",
            },
          },
        ],
        total_price: 100000,
      },
      loading: false,
      error: null,
    };

    const state = reducer(
      initialState,
      stockUpdated({
        product_id: 6,
        stock: 0,
        available: true,
        has_attributes: true,
        attributes: [
          {
            id: 1,
            name: 'диагональ',
            value: "60''",
            stock: 2,
            available: true,
            in_stock: true,
          },
          {
            id: 2,
            name: 'диагональ',
            value: "65''",
            stock: 1,
            available: true,
            in_stock: true,
          },
        ],
      })
    );

    expect(
      state.data.items[0].product.stock
    ).toBe(0);

    expect(
      state.data.items[0].attribute_stock
    ).toBe(2);

    expect(
      state.data.items[0].product.available
    ).toBe(true);
  });
});