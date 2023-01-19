import { Router } from "express";
import { z } from "zod";
import dayjs from "dayjs";

import { prisma } from "./infra/prisma/connection";

export const router = Router();

router.get("/", (request, response) => {
  const { name, version } = require("../package.json");
  return response.status(200).json({
    name,
    version,
  });
});

router.post("/habits", async (request, response) => {
  const createHabitBody = z.object({
    title: z.string(),
    weekDays: z.array(z.number().min(1).max(6)),
  });

  const { title, weekDays } = createHabitBody.parse(request.body);

  const today = dayjs().startOf("day").toDate();

  await prisma.habit.create({
    data: {
      title,
      createdAt: today,
      weekDays: {
        create: weekDays.map((weekDay) => ({ weekDay })),
      },
    },
  });

  return response.sendStatus(201);
});

router.patch("/habits/:id/toggle", async (request, response) => {
  const toggleHabitParams = z.object({
    id: z.string().uuid(),
  });

  const { id } = toggleHabitParams.parse(request.params);

  const today = dayjs().startOf("day").toDate();

  let day = await prisma.day.findUnique({
    where: {
      date: today,
    },
  });

  if (!day) {
    day = await prisma.day.create({
      data: {
        date: today,
      },
    });
  }

  const dayHabit = await prisma.dayHabit.findUnique({
    where: {
      dayId_habitId: {
        dayId: day.id,
        habitId: id,
      },
    },
  });

  if (dayHabit) {
    await prisma.dayHabit.delete({
      where: {
        id: dayHabit.id,
      },
    });
  } else {
    await prisma.dayHabit.create({
      data: {
        dayId: day.id,
        habitId: id,
      },
    });
  }

  return response.sendStatus(200);
});

router.get("/day", async (request, response) => {
  const getDayParams = z.object({
    date: z.coerce.date(),
  });

  const { date } = getDayParams.parse(request.query);

  const parsedDate = dayjs(date).startOf("day");
  const weekDay = parsedDate.get("day");

  const availableHabits = await prisma.habit.findMany({
    where: {
      createdAt: {
        lte: date,
      },
      weekDays: {
        some: {
          weekDay,
        },
      },
    },
  });

  const day = await prisma.day.findUnique({
    where: {
      date: parsedDate.toDate(),
    },
    include: {
      habits: true,
    },
  });

  const completedHabits = day?.habits.map((habit) => habit.habitId);

  return response.status(200).json({
    availableHabits,
    completedHabits,
  });
});

router.get("/summary", async (request, response) => {
  const summary = await prisma.$queryRaw`
    select
      d.id,
      d.date,
      (
        select
          cast(count(*) as float)
        from
          day_habits dh
        where
          dh.day_id = d.id
      ) completed,
      (
        select
          cast(count(*) as float)
        from
          habit_week_days hwd
        join
          habits h on h.id = hwd.habit_id
        where
          hwd.week_day = (select extract(isodow from date (d.date)))
          and
          h.created_at <= d.date
      ) amount
    from
      days d
  `;

  return response.status(200).json(summary);
});
