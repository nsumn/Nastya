from aiogram import Router

from . import (admin, browse, info, quiz, relay, shop, store_admin,
               subscription)


def setup_routers() -> Router:
    router = Router()
    router.include_router(browse.router)
    router.include_router(subscription.router)
    router.include_router(shop.router)
    router.include_router(quiz.router)
    router.include_router(info.router)
    # admin/store_admin — до relay: ввод значений и файлов идёт через FSM-состояния,
    # чтобы обычные сообщения админа (ответы покупателям) ловил relay.
    router.include_router(admin.router)
    router.include_router(store_admin.router)
    # relay подключаем последним: он ловит произвольные сообщения (чеки),
    # которые не обработали команды и кнопки выше.
    router.include_router(relay.router)
    return router
