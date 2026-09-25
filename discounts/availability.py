from django.utils import timezone

from .models import Discount, DiscountUsage, PromoCode


class DiscountAvailabilityService:
    """
    Проверяет, может ли скидка быть использована.

    Сервис:
    - проверяет статус и время действия;
    - проверяет общий лимит использования;
    - проверяет лимит на пользователя;
    - проверяет промокод;
    - проверяет лимиты промокода.

    Сервис НЕ:
    - рассчитывает сумму скидки;
    - изменяет Cart/Product/Order;
    - создаёт DiscountUsage.

    Финальная проверка лимитов должна повторяться
    внутри transaction.atomic() при создании заказа.
    """

    def __init__(self, user=None, now=None):
        self.user = user
        self.now = now or timezone.now()

    def is_available(
        self,
        discount: Discount,
        promo_code: PromoCode | None = None,
    ) -> bool:
        if not self._is_discount_active(discount):
            return False

        if not self._check_global_usage_limit(discount):
            return False

        if not self._check_user_usage_limit(discount):
            return False

        if promo_code is not None:
            if not self._is_promo_code_available(
                discount=discount,
                promo_code=promo_code,
            ):
                return False

        return True

    def _is_discount_active(
        self,
        discount: Discount,
    ) -> bool:
        return discount.is_active(self.now)

    def _check_global_usage_limit(
        self,
        discount: Discount,
    ) -> bool:
        if discount.usage_limit is None:
            return True

        usage_count = DiscountUsage.objects.filter(
            discount=discount,
        ).count()

        return usage_count < discount.usage_limit

    def _check_user_usage_limit(
        self,
        discount: Discount,
    ) -> bool:
        if discount.usage_limit_per_user is None:
            return True

        # Гость может видеть и получать скидку.
        # Ограничение "на пользователя" невозможно применить,
        # пока пользователь не авторизован.
        if self.user is None or not self.user.is_authenticated:
            return True

        usage_count = DiscountUsage.objects.filter(
            discount=discount,
            user=self.user,
        ).count()

        return usage_count < discount.usage_limit_per_user

    def _is_promo_code_available(
        self,
        discount: Discount,
        promo_code: PromoCode,
    ) -> bool:
        # Промокод должен принадлежать именно этой скидке.
        if promo_code.discount_id != discount.id:
            return False

        if not promo_code.is_active_now(self.now):
            return False

        if (
            promo_code.usage_limit is not None
            and not self._check_promo_code_global_limit(
                promo_code,
            )
        ):
            return False

        if (
            promo_code.usage_limit_per_user is not None
            and not self._check_promo_code_user_limit(
                promo_code,
            )
        ):
            return False

        return True

    def _check_promo_code_global_limit(
        self,
        promo_code: PromoCode,
    ) -> bool:
        usage_count = DiscountUsage.objects.filter(
            promo_code=promo_code,
        ).count()

        return usage_count < promo_code.usage_limit

    def _check_promo_code_user_limit(
        self,
        promo_code: PromoCode,
    ) -> bool:
        # Для гостя ограничение "на пользователя"
        # пока неприменимо.
        if self.user is None or not self.user.is_authenticated:
            return True

        usage_count = DiscountUsage.objects.filter(
            promo_code=promo_code,
            user=self.user,
        ).count()

        return usage_count < promo_code.usage_limit_per_user


def get_available_discounts(
    discounts,
    user=None,
    promo_code=None,
    now=None,
):
    """
    Возвращает только доступные скидки.

    Принимает QuerySet или любой iterable.
    """

    service = DiscountAvailabilityService(
        user=user,
        now=now,
    )

    return [
        discount
        for discount in discounts
        if service.is_available(
            discount=discount,
            promo_code=promo_code,
        )
    ]