from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone

from discounts.constants import DiscountStatus, DiscountType
from discounts.models import Discount, DiscountUsage, PromoCode
from discounts.availability import DiscountAvailabilityService


User = get_user_model()


class DiscountAvailabilityServiceTests(TestCase):
    def setUp(self):
        self.now = timezone.now()

        self.discount = Discount.objects.create(
            name='Скидка 10%',
            discount_type=DiscountType.PERCENT,
            value=Decimal('10.00'),
            status=DiscountStatus.ACTIVE,
            starts_at=self.now - timedelta(days=1),
            ends_at=self.now + timedelta(days=1),
        )

        self.user = User.objects.create_user(
            username='test-user',
            password='test-password',
        )

    def test_active_discount_is_available(self):
        service = DiscountAvailabilityService(
            now=self.now,
        )

        self.assertTrue(
            service.is_available(self.discount)
        )

    def test_draft_discount_is_not_available(self):
        self.discount.status = DiscountStatus.DRAFT
        self.discount.save(update_fields=['status'])

        service = DiscountAvailabilityService(
            now=self.now,
        )

        self.assertFalse(
            service.is_available(self.discount)
        )

    def test_expired_discount_is_not_available(self):
        self.discount.ends_at = self.now - timedelta(seconds=1)
        self.discount.save(update_fields=['ends_at'])

        service = DiscountAvailabilityService(
            now=self.now,
        )

        self.assertFalse(
            service.is_available(self.discount)
        )

    def test_global_usage_limit(self):
        self.discount.usage_limit = 1
        self.discount.save(update_fields=['usage_limit'])

        DiscountUsage.objects.create(
            discount=self.discount,
            user=self.user,
            discount_amount=Decimal('100.00'),
        )

        service = DiscountAvailabilityService(
            now=self.now,
        )

        self.assertFalse(
            service.is_available(self.discount)
        )

    def test_user_usage_limit(self):
        self.discount.usage_limit_per_user = 1
        self.discount.save(
            update_fields=['usage_limit_per_user']
        )

        DiscountUsage.objects.create(
            discount=self.discount,
            user=self.user,
            discount_amount=Decimal('100.00'),
        )

        service = DiscountAvailabilityService(
            user=self.user,
            now=self.now,
        )

        self.assertFalse(
            service.is_available(self.discount)
        )

    def test_guest_can_use_discount_with_per_user_limit(self):
        self.discount.usage_limit_per_user = 1
        self.discount.save(
            update_fields=['usage_limit_per_user']
        )

        service = DiscountAvailabilityService(
            user=None,
            now=self.now,
        )

        self.assertTrue(
            service.is_available(self.discount)
        )

    def test_correct_promo_code_is_available(self):
        promo_code = PromoCode.objects.create(
            discount=self.discount,
            code='SAVE10',
        )

        service = DiscountAvailabilityService(
            user=self.user,
            now=self.now,
        )

        self.assertTrue(
            service.is_available(
                discount=self.discount,
                promo_code=promo_code,
            )
        )

    def test_promo_code_from_another_discount_is_not_available(self):
        another_discount = Discount.objects.create(
            name='Другая скидка',
            discount_type=DiscountType.PERCENT,
            value=Decimal('20.00'),
            status=DiscountStatus.ACTIVE,
            starts_at=self.now - timedelta(days=1),
            ends_at=self.now + timedelta(days=1),
        )

        promo_code = PromoCode.objects.create(
            discount=another_discount,
            code='OTHER20',
        )

        service = DiscountAvailabilityService(
            user=self.user,
            now=self.now,
        )

        self.assertFalse(
            service.is_available(
                discount=self.discount,
                promo_code=promo_code,
            )
        )

    def test_promo_code_global_usage_limit(self):
        promo_code = PromoCode.objects.create(
            discount=self.discount,
            code='LIMITED',
            usage_limit=1,
        )

        DiscountUsage.objects.create(
            discount=self.discount,
            user=self.user,
            promo_code=promo_code,
            discount_amount=Decimal('100.00'),
        )

        service = DiscountAvailabilityService(
            user=self.user,
            now=self.now,
        )

        self.assertFalse(
            service.is_available(
                discount=self.discount,
                promo_code=promo_code,
            )
        )

    def test_promo_code_user_usage_limit(self):
        promo_code = PromoCode.objects.create(
            discount=self.discount,
            code='USERLIMIT',
            usage_limit_per_user=1,
        )

        DiscountUsage.objects.create(
            discount=self.discount,
            user=self.user,
            promo_code=promo_code,
            discount_amount=Decimal('100.00'),
        )

        service = DiscountAvailabilityService(
            user=self.user,
            now=self.now,
        )

        self.assertFalse(
            service.is_available(
                discount=self.discount,
                promo_code=promo_code,
            )
        )