"""Клиент Platega.io.

Документация: https://docs.platega.io/
- Создание транзакции: POST {base}/transaction/process
  Заголовки: X-MerchantId, X-Secret, Content-Type: application/json
  Тело: paymentMethod, paymentDetails{amount, currency}, description,
        return, failedUrl, payload
  Ответ: transactionId, status (PENDING), redirect, ...
- Статус: GET {base}/transaction/{id} -> { ..., "status": "..." }
- Вебхук (callback): POST на наш URL с заголовками X-MerchantId/X-Secret,
  тело { id, amount, payload, status }, статусы CONFIRMED / CANCELED.
"""
from __future__ import annotations

import logging
import uuid
from dataclasses import dataclass
from typing import Optional

from aiohttp import ClientSession, ClientTimeout

log = logging.getLogger(__name__)

STATUS_CONFIRMED = "CONFIRMED"
STATUS_CANCELED = "CANCELED"
STATUS_PENDING = "PENDING"


@dataclass
class Transaction:
    tx_id: str
    status: str
    redirect: str
    raw: dict


class PlategaClient:
    def __init__(self, merchant_id: str, secret: str,
                 base_url: str = "https://app.platega.io") -> None:
        self.merchant_id = merchant_id
        self.secret = secret
        self.base_url = base_url.rstrip("/")
        self._session: Optional[ClientSession] = None

    @property
    def _headers(self) -> dict:
        return {
            "X-MerchantId": self.merchant_id,
            "X-Secret": self.secret,
            "Content-Type": "application/json",
        }

    async def _ensure_session(self) -> ClientSession:
        if self._session is None or self._session.closed:
            self._session = ClientSession(timeout=ClientTimeout(total=30))
        return self._session

    def verify_callback(self, merchant_id: Optional[str],
                        secret: Optional[str]) -> bool:
        """Проверка заголовков входящего вебхука от Platega."""
        return merchant_id == self.merchant_id and secret == self.secret

    async def create_transaction(self, *, amount: float, currency: str,
                                 payment_method: int, description: str,
                                 payload: str, return_url: str,
                                 failed_url: str) -> Transaction:
        tx_id = str(uuid.uuid4())
        body = {
            "paymentMethod": payment_method,
            "id": tx_id,
            "paymentDetails": {"amount": amount, "currency": currency},
            "description": description,
            "return": return_url,
            "failedUrl": failed_url,
            "payload": payload,
        }
        session = await self._ensure_session()
        url = f"{self.base_url}/transaction/process"
        async with session.post(url, json=body, headers=self._headers) as resp:
            text = await resp.text()
            if resp.status >= 400:
                raise RuntimeError(
                    f"Platega create_transaction failed [{resp.status}]: {text}")
            data = await _safe_json(resp, text)
        returned_id = str(data.get("transactionId") or data.get("id") or tx_id)
        return Transaction(
            tx_id=returned_id,
            status=str(data.get("status", STATUS_PENDING)),
            redirect=str(data.get("redirect", "") or ""),
            raw=data,
        )

    async def get_status(self, tx_id: str) -> str:
        session = await self._ensure_session()
        url = f"{self.base_url}/transaction/{tx_id}"
        async with session.get(url, headers=self._headers) as resp:
            text = await resp.text()
            if resp.status >= 400:
                raise RuntimeError(
                    f"Platega get_status failed [{resp.status}]: {text}")
            data = await _safe_json(resp, text)
        return str(data.get("status", STATUS_PENDING))

    async def close(self) -> None:
        if self._session and not self._session.closed:
            await self._session.close()


async def _safe_json(resp, text: str) -> dict:
    try:
        return await resp.json(content_type=None)
    except Exception:  # noqa: BLE001
        log.warning("Platega returned non-JSON body: %s", text[:300])
        return {}
