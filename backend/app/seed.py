"""Создание тестовых учётных данных и демонстрационных данных при первом запуске."""
import asyncio
from datetime import datetime, date, time, timedelta
from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models.user import User, UserRole
from app.models.funnel import Funnel, FunnelStage
from app.models.contact import Contact
from app.models.hall import Hall, HallAvailability
from app.models.deal import Deal, DealTask
from app.models.task import Task
from app.core.security import get_password_hash


DEFAULT_STAGES = [
    ("Первое касание", False, False),
    ("Коммерческое предложение", False, False),
    ("Ожидание оплаты", False, False),
    ("Успешные", True, False),
    ("Отказы", False, True),
]

# Тестовые пользователи: email / пароль / имя / роль
TEST_USERS = [
    ("admin@eventcrm.local", "admin", "Администратор", UserRole.ADMIN),
    ("manager@eventcrm.local", "manager", "Менеджер Иванова", UserRole.MANAGER),
    ("employee@eventcrm.local", "employee", "Сотрудник Петров", UserRole.EMPLOYEE),
]

# Демо-контакты (арендаторы)
DEMO_CONTACTS = [
    ("ООО «Праздник»", "Анна Смирнова", "+7 (495) 111-22-33", "anna@prazdnik.ru"),
    ("ИП Козлов", "Михаил Козлов", "+7 (495) 222-33-44", "kozlov@mail.ru"),
    ("Event Pro", "Елена Новикова", "+7 (495) 333-44-55", "elena@eventpro.ru"),
    ("Студия танцев «Ритм»", "Дарья Волкова", "+7 (495) 444-55-66", "info@ritm-dance.ru"),
    ("Корпоратив Сервис", "Сергей Федоров", "+7 (495) 555-66-77", "s.fedorov@corp.ru"),
]

# Залы: название, описание, цена по умолчанию
DEMO_HALLS = [
    ("Большой", "До 200 человек, сцена, проектор, звуковое оборудование", 35000),
    ("Малый", "До 50 человек, камерные мероприятия", 15000),
    ("Кафе", "До 80 человек, барная стойка, кухня", 20000),
    ("Каминная", "До 30 человек, уютная атмосфера, камин", 12000),
    ("Массажная", "До 10 человек, массажные столы, релакс-зона", 8000),
]

# Расписание доступности зала: пн-вс 9:00–22:00 (day 0=пн, 6=вс)
def make_availability(hall_id: int):
    return [
        HallAvailability(hall_id=hall_id, day_of_week=d, start_time=time(9, 0), end_time=time(22, 0), is_available=True)
        for d in range(7)
    ]


async def seed():
    async with AsyncSessionLocal() as db:
        r = await db.execute(select(User).limit(1))
        if r.scalar_one_or_none():
            return  # already seeded

        # Пользователи
        users = []
        for email, password, full_name, role in TEST_USERS:
            u = User(
                email=email,
                hashed_password=get_password_hash(password),
                full_name=full_name,
                role=role,
            )
            db.add(u)
            await db.flush()
            users.append(u)

        admin, manager, employee = users[0], users[1], users[2]

        # Воронка
        funnel = Funnel(name="Продажи", is_default=True)
        db.add(funnel)
        await db.flush()
        stages = []
        for i, (name, is_won, is_lost) in enumerate(DEFAULT_STAGES):
            s = FunnelStage(funnel_id=funnel.id, name=name, order=i, is_won=is_won, is_lost=is_lost)
            db.add(s)
            await db.flush()
            stages.append(s)

        stage_first, stage_kp, stage_wait, stage_won, stage_lost = stages

        # Залы
        halls = []
        for name, desc, price in DEMO_HALLS:
            h = Hall(name=name, description=desc, default_price=price)
            db.add(h)
            await db.flush()
            for av in make_availability(h.id):
                db.add(av)
            halls.append(h)

        hall_big, hall_small, hall_cafe, hall_fireplace, hall_massage = halls

        # Контакты
        contacts = []
        for company, name, phone, email in DEMO_CONTACTS:
            c = Contact(name=name, company=company, phone=phone, email=email)
            db.add(c)
            await db.flush()
            contacts.append(c)

        today = date.today()

        # Демо-сделки в разных этапах
        demo_deals = [
            ("Свадьба Ивановых", contacts[0], stage_first, manager, hall_big, today + timedelta(days=30), 35000, 10000, 80, False),
            ("Корпоратив IT-компании", contacts[4], stage_kp, manager, hall_big, today + timedelta(days=45), 50000, 15000, 120, False),
            ("День рождения ребёнка", contacts[3], stage_wait, employee, hall_small, today + timedelta(days=14), 15000, 5000, 25, True),
            ("Мастер-класс по танцам", contacts[3], stage_won, employee, hall_small, today - timedelta(days=10), 15000, 5000, 30, True),
            ("Конференция «Маркетинг 2024»", contacts[2], stage_won, manager, hall_big, today - timedelta(days=5), 70000, 20000, 150, True),
            ("Отказ: перенос даты", contacts[1], stage_lost, manager, None, None, 0, 0, None, False),
        ]

        for title, contact, stage, resp, hall, ev_date, rent, dep, participants, dep_paid in demo_deals:
            d = Deal(
                title=title,
                contact_id=contact.id,
                funnel_id=funnel.id,
                stage_id=stage.id,
                responsible_id=resp.id,
                hall_id=hall.id if hall else None,
                event_date=ev_date,
                event_time_start=time(10, 0) if ev_date else None,
                event_time_end=time(18, 0) if ev_date else None,
                event_organizer_name=contact.name,
                rental_price=rent,
                deposit_amount=dep,
                deposit_paid=dep_paid,
                participants_count=participants,
                comments="Демо-сделка" if stage != stage_lost else "Клиент перенёс на неопределённый срок.",
                source="demo",
            )
            db.add(d)
            await db.flush()
            if "Свадьба" in title:
                db.add(DealTask(deal_id=d.id, title="Подготовить договор", order=0))
                db.add(DealTask(deal_id=d.id, title="Согласовать меню", order=1))
            if "Корпоратив" in title:
                db.add(DealTask(deal_id=d.id, title="Отправить КП", order=0))

        # Обновляем статистику контактов по выигранным сделкам
        for c in contacts:
            won_deals = [dd for dd in demo_deals if dd[1] == c and dd[2] == stage_won]
            if won_deals:
                c.total_events_count = len(won_deals)
                c.total_amount = sum(dd[6] for dd in won_deals)

        # Задачи с напоминаниями
        tomorrow = datetime.now() + timedelta(days=1)
        db.add(Task(
            title="Позвонить ООО «Праздник» по смете",
            reminder_at=tomorrow.replace(hour=10, minute=0, second=0, microsecond=0),
            assigned_to_id=manager.id,
            created_by_id=admin.id,
        ))
        db.add(Task(
            title="Отправить договор по корпоративу",
            reminder_at=tomorrow.replace(hour=14, minute=0, second=0, microsecond=0),
            assigned_to_id=manager.id,
            created_by_id=admin.id,
        ))
        db.add(Task(
            title="Проверить наличие оборудования в малом зале",
            is_done=True,
            assigned_to_id=employee.id,
            created_by_id=manager.id,
        ))

        await db.commit()
    print("Seed: test users and demo data created. See DEPLOY_WINDOWS.md for credentials.")


async def ensure_halls():
    """Ensure all 5 halls exist, even if DB was seeded with old code."""
    print("DEBUG: [ensure_halls] Checking halls in DB...")
    async with AsyncSessionLocal() as db:
        try:
            result = await db.execute(select(Hall))
            existing_halls = result.scalars().all()
            existing_names = {h.name for h in existing_halls}
            print(f"DEBUG: [ensure_halls] Found {len(existing_names)} existing halls: {existing_names}")
            
            created = False
            for name, desc, price in DEMO_HALLS:
                if name not in existing_names:
                    print(f"DEBUG: [ensure_halls] Creating missing hall: {name}")
                    h = Hall(name=name, description=desc, default_price=price)
                    db.add(h)
                    await db.flush()
                    print(f"DEBUG: [ensure_halls] Hall {name} created with ID {h.id}, adding availability...")
                    for av in make_availability(h.id):
                        db.add(av)
                    created = True
            
            if created:
                await db.commit()
                print("DEBUG: [ensure_halls] Changes committed successfully")
            else:
                print("DEBUG: [ensure_halls] No halls were missing, nothing to do")
        except Exception as e:
            print(f"DEBUG: [ensure_halls] ERROR: {e}")
            raise e


if __name__ == "__main__":
    asyncio.run(seed())
