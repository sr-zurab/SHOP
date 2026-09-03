from rest_framework import viewsets, permissions
from rest_framework.response import Response
from .models import Review
from .serializers import ReviewSerializer, CreateReviewSerializer


class ReviewViewSet(viewsets.ModelViewSet):
    queryset = Review.objects.select_related('user', 'product')
    http_method_names = ['get', 'post', 'delete']  # без PUT/PATCH — отзыв не редактируется, только удаляется и создаётся заново

    def get_permissions(self):
        if self.action in ('create', 'destroy'):
            return [permissions.IsAuthenticated()]
        return [permissions.AllowAny()]

    def get_queryset(self):
        qs = super().get_queryset()
        product_id = self.request.query_params.get('product')
        if product_id:
            qs = qs.filter(product_id=product_id)
        return qs

    def get_serializer_class(self):
        if self.action == 'create':
            return CreateReviewSerializer
        return ReviewSerializer

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def perform_destroy(self, instance):
        # можно удалить только свой отзыв
        if instance.user != self.request.user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Нельзя удалить чужой отзыв')
        instance.delete()