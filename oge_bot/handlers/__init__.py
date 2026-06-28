from aiogram import Router

from . import admin, browse, info, relay, shop, subscription


def setup_routers() -> Router:
    router = Router()
    router.include_router(browse.router)
    router.include_router(subscription.router)
    router.include_router(shop.router)
    router.include_router(info.router)
    # admin — до relay: ввод новых значений (карта/цена) идёт через FSM-состояния,
    # чтобы обычные сообщения админа (ответы покупателям) ловил relay.
    router.include_router(admin.router)
    # relay подключаем последним: он ловит произвольные сообщения (чеки),
    # которые не обработали команды и кнопки выше.
    router.include_router(relay.router)
    return router
