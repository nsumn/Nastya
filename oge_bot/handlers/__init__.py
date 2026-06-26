from aiogram import Router

from . import browse, info, relay, shop, subscription


def setup_routers() -> Router:
    router = Router()
    router.include_router(browse.router)
    router.include_router(subscription.router)
    router.include_router(shop.router)
    router.include_router(info.router)
    # relay подключаем последним: он ловит произвольные сообщения (чеки),
    # которые не обработали команды и кнопки выше.
    router.include_router(relay.router)
    return router
