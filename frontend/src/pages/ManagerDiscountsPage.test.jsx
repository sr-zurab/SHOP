/**
 * @vitest-environment jsdom
 */

import {
  beforeEach,
  afterEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import {
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';

import '@testing-library/jest-dom/vitest';


const mocks = vi.hoisted(() => {
  const createManagerDiscount = vi.fn(
    (data) => ({
      type: 'discounts/createManagerDiscount',
      payload: data,
    })
  );

  const updateManagerDiscount = vi.fn(
    ({ id, data }) => ({
      type: 'discounts/updateManagerDiscount',
      payload: {
        id,
        data,
      },
    })
  );

  const deleteManagerDiscount = vi.fn(
    (id) => ({
      type: 'discounts/deleteManagerDiscount',
      payload: id,
    })
  );

  const fetchManagerDiscounts = vi.fn(
    () => ({
      type: 'discounts/fetchManagerDiscounts',
    })
  );

  const fetchManagerProducts = vi.fn(
    (params) => ({
      type: 'products/fetchManagerList',
      payload: params,
    })
  );

  const fetchCategories = vi.fn(
    () => ({
      type: 'categories/fetch',
    })
  );

  createManagerDiscount.fulfilled = {
    match: vi.fn(() => true),
  };

  updateManagerDiscount.fulfilled = {
    match: vi.fn(() => true),
  };

  deleteManagerDiscount.fulfilled = {
    match: vi.fn(() => true),
  };

  return {
    dispatch: vi.fn(
      (action) => action
    ),

    createManagerDiscount,
    updateManagerDiscount,
    deleteManagerDiscount,
    fetchManagerDiscounts,
    fetchManagerProducts,
    fetchCategories,

    state: {
      profile: {
        data: {
          is_manager: true,
        },
      },

      discounts: {
        items: [],
        managerLoading: false,
        managerError: null,
      },

      products: {
        managerList: [
          {
            id: 3,
            name: 'Телевизор Samsung',
          },
          {
            id: 7,
            name: 'Ноутбук Lenovo',
          },
        ],
        managerNext: null,
        managerLoading: false,
      },

      categories: {
        list: [
          {
            id: 10,
            name: 'Телевизоры',
          },
          {
            id: 20,
            name: 'Ноутбуки',
          },
        ],
      },
    },
  };
});


vi.mock('react-redux', () => ({
  useDispatch: () => mocks.dispatch,

  useSelector: (selector) =>
    selector(mocks.state),
}));


vi.mock('react-router-dom', () => ({
  Link: ({
    children,
    ...props
  }) => (
    <a {...props}>
      {children}
    </a>
  ),
}));


vi.mock(
  '../features/discounts/discountsSlice',
  () => ({
    createManagerDiscount:
      mocks.createManagerDiscount,

    deleteManagerDiscount:
      mocks.deleteManagerDiscount,

    fetchManagerDiscounts:
      mocks.fetchManagerDiscounts,

    updateManagerDiscount:
      mocks.updateManagerDiscount,
  })
);


vi.mock(
  '../features/products/productsSlice',
  () => ({
    fetchManagerProducts:
      mocks.fetchManagerProducts,
  })
);


vi.mock(
  '../features/categories/categoriesSlice',
  () => ({
    fetchCategories:
      mocks.fetchCategories,
  })
);


import ManagerDiscountsPage from './ManagerDiscountsPage';


describe('ManagerDiscountsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.state.discounts = {
      items: [],
      managerLoading: false,
      managerError: null,
    };

    mocks.state.products = {
      managerList: [
        {
          id: 3,
          name: 'Телевизор Samsung',
        },
        {
          id: 7,
          name: 'Ноутбук Lenovo',
        },
      ],
      managerNext: null,
      managerLoading: false,
    };

    mocks.state.categories = {
      list: [
        {
          id: 10,
          name: 'Телевизоры',
        },
        {
          id: 20,
          name: 'Ноутбуки',
        },
      ],
    };
  });


  afterEach(() => {
    cleanup();
  });


  const openForm = () => {
    render(
      <ManagerDiscountsPage />
    );

    fireEvent.click(
      screen.getByRole(
        'button',
        {
          name: 'Новая скидка',
        }
      )
    );
  };


  const fillRequiredFields = () => {
    fireEvent.change(
      screen.getByPlaceholderText(
        'Название'
      ),
      {
        target: {
          value: 'Тестовая скидка',
        },
      }
    );

    fireEvent.change(
      screen.getByPlaceholderText(
        'Процент'
      ),
      {
        target: {
          value: '15',
        },
      }
    );

    const datetimeInputs =
      screen
        .getAllByDisplayValue('')
        .filter(
          (input) =>
            input.getAttribute(
              'type'
            ) === 'datetime-local'
        );

    fireEvent.change(
      datetimeInputs[0],
      {
        target: {
          value:
            '2026-09-23T10:00',
        },
      }
    );

    fireEvent.change(
      datetimeInputs[1],
      {
        target: {
          value:
            '2026-10-01T10:00',
        },
      }
    );
  };


  it('загружает данные менеджера при открытии страницы', () => {
    render(
      <ManagerDiscountsPage />
    );

    expect(
      mocks.fetchManagerDiscounts
    ).toHaveBeenCalled();

    expect(
      mocks.fetchCategories
    ).toHaveBeenCalled();

    expect(
      mocks.fetchManagerProducts
    ).toHaveBeenCalledWith({
      page: 1,
    });
  });


  it('показывает три области применения скидки', () => {
    openForm();

    const scopeSelect =
      screen.getByDisplayValue(
        'Конкретный товар'
      );

    expect(
      scopeSelect
    ).toBeInTheDocument();

    expect(
      screen.getByRole(
        'option',
        {
          name: 'Конкретный товар',
        }
      )
    ).toBeInTheDocument();

    expect(
      screen.getByRole(
        'option',
        {
          name: 'Категория',
        }
      )
    ).toBeInTheDocument();

    expect(
      screen.getByRole(
        'option',
        {
          name: 'Весь ассортимент',
        }
      )
    ).toBeInTheDocument();
  });


  it('для области "Конкретный товар" показывает выбор товара', () => {
    openForm();

    expect(
      screen.getByRole(
        'option',
        {
          name: 'Телевизор Samsung',
        }
      )
    ).toBeInTheDocument();

    expect(
      screen.getByRole(
        'option',
        {
          name: 'Ноутбук Lenovo',
        }
      )
    ).toBeInTheDocument();

    expect(
      screen.queryByRole(
        'option',
        {
          name: 'Телевизоры',
        }
      )
    ).not.toBeInTheDocument();
  });


  it('при выборе категории показывает выбор категории и скрывает выбор товара', () => {
    openForm();

    fireEvent.change(
      screen.getByDisplayValue(
        'Конкретный товар'
      ),
      {
        target: {
          value: 'category',
        },
      }
    );

    expect(
      screen.getByRole(
        'option',
        {
          name: 'Телевизоры',
        }
      )
    ).toBeInTheDocument();

    expect(
      screen.getByRole(
        'option',
        {
          name: 'Ноутбуки',
        }
      )
    ).toBeInTheDocument();

    expect(
      screen.queryByRole(
        'option',
        {
          name: 'Телевизор Samsung',
        }
      )
    ).not.toBeInTheDocument();
  });


  it('при выборе всего ассортимента скрывает выбор товара и категории', () => {
    openForm();

    fireEvent.change(
      screen.getByDisplayValue(
        'Конкретный товар'
      ),
      {
        target: {
          value: 'global',
        },
      }
    );

    expect(
      screen.queryByRole(
        'option',
        {
          name: 'Телевизор Samsung',
        }
      )
    ).not.toBeInTheDocument();

    expect(
      screen.queryByRole(
        'option',
        {
          name: 'Телевизоры',
        }
      )
    ).not.toBeInTheDocument();
  });


  it('создаёт скидку для конкретного товара с products', () => {
    openForm();

    fillRequiredFields();

    fireEvent.change(
      screen.getByDisplayValue(
        'Выберите товар'
      ),
      {
        target: {
          value: '3',
        },
      }
    );

    fireEvent.click(
      screen.getByRole(
        'button',
        {
          name: 'Создать',
        }
      )
    );

    expect(
      mocks.createManagerDiscount
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Тестовая скидка',
        discount_type: 'percent',
        value: '15',
        products: [3],
        categories: [],
      })
    );

    expect(
      mocks.createManagerDiscount
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        minimum_order_amount: null,
        max_discount_amount: null,
        usage_limit: null,
        usage_limit_per_user: null,
      })
    );
  });


  it('создаёт скидку для категории с categories', () => {
    openForm();

    fillRequiredFields();

    fireEvent.change(
      screen.getByDisplayValue(
        'Конкретный товар'
      ),
      {
        target: {
          value: 'category',
        },
      }
    );

    fireEvent.change(
      screen.getByDisplayValue(
        'Выберите категорию'
      ),
      {
        target: {
          value: '10',
        },
      }
    );

    fireEvent.click(
      screen.getByRole(
        'button',
        {
          name: 'Создать',
        }
      )
    );

    expect(
      mocks.createManagerDiscount
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        products: [],
        categories: [10],
      })
    );
  });


  it('создаёт глобальную скидку с пустыми products и categories', () => {
    openForm();

    fillRequiredFields();

    fireEvent.change(
      screen.getByDisplayValue(
        'Конкретный товар'
      ),
      {
        target: {
          value: 'global',
        },
      }
    );

    fireEvent.click(
      screen.getByRole(
        'button',
        {
          name: 'Создать',
        }
      )
    );

    expect(
      mocks.createManagerDiscount
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        products: [],
        categories: [],
      })
    );
  });


  it('не создаёт скидку товара без выбранного товара', () => {
    openForm();

    fillRequiredFields();

    fireEvent.click(
      screen.getByRole(
        'button',
        {
          name: 'Создать',
        }
      )
    );

    expect(
      mocks.createManagerDiscount
    ).not.toHaveBeenCalled();
  });


  it('не создаёт скидку категории без выбранной категории', () => {
    openForm();

    fillRequiredFields();

    fireEvent.change(
      screen.getByDisplayValue(
        'Конкретный товар'
      ),
      {
        target: {
          value: 'category',
        },
      }
    );

    fireEvent.click(
      screen.getByRole(
        'button',
        {
          name: 'Создать',
        }
      )
    );

    expect(
      mocks.createManagerDiscount
    ).not.toHaveBeenCalled();
  });


  it('редактирование скидки восстанавливает область товара', () => {
    mocks.state.discounts = {
      items: [
        {
          id: 10,
          name: 'Скидка на Samsung',
          description: '',
          discount_type: 'percent',
          value: '20.00',
          status: 'active',
          starts_at:
            '2026-09-23T10:00:00Z',
          ends_at:
            '2026-10-01T10:00:00Z',
          priority: 0,
          is_stackable: false,
          minimum_order_amount: null,
          max_discount_amount: null,
          usage_limit: null,
          usage_limit_per_user: null,
          products: [3],
          categories: [],
        },
      ],
      managerLoading: false,
      managerError: null,
    };

    render(
      <ManagerDiscountsPage />
    );

    fireEvent.click(
      screen.getByRole(
        'button',
        {
          name: 'Редактировать скидку',
        }
      )
    );

    expect(
      screen.getByDisplayValue(
        'Конкретный товар'
      )
    ).toBeInTheDocument();

    expect(
      screen.getByDisplayValue(
        'Телевизор Samsung'
      )
    ).toBeInTheDocument();
  });
});