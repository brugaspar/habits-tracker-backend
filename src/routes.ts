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
