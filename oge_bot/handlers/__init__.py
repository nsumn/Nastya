from aiogram import Router

from . import browse, subscription


def setup_routers() -> Router:
    router = Router()
    router.include_router(browse.router)
    router.include_router(subscription.router)
    return router
