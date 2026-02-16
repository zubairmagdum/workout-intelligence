'use client';

import { useState } from 'react';

interface WeekData {
  week: number;
  weight: string;
  sets: string;
  reps: string;
}

interface Recommendation {
  weight: number;
  sets: number;
  reps: number;
  explanations: string[];
}

export default function DemoPage() {
  const [exerciseName, setExerciseName] = useState('Back Squat');
  const [weekData, setWeekData] = useState<WeekData[]>([
    { week: 1, weight: '', sets: '', reps: '' },
    { week: 2, weight: '', sets: '', reps: '' },
    { week: 3, weight: '', sets: '', reps: '' },
    { week: 4, weight: '', sets: '', reps: '' },
  ]);

  const [showResult, setShowResult] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);

  const handleWeekDataChange = (
    index: number,
    field: keyof Omit<WeekData, 'week'>,
    value: string
  ) => {
    const newWeekData = [...weekData];
    newWeekData[index][field] = value;
    setWeekData(newWeekData);
  };

  const validateInputs = (): boolean => {
    const newErrors: string[] = [];

    if (!exerciseName.trim()) {
      newErrors.push('Exercise name is required');
    }

    weekData.forEach((week) => {
      if (!week.weight || !week.sets || !week.reps) {
        newErrors.push(`Week ${week.week}: All fields are required`);
      } else {
        const weight = parseFloat(week.weight);
        const sets = parseInt(week.sets, 10);
        const reps = parseInt(week.reps, 10);

        if (isNaN(weight) || weight < 0) {
          newErrors.push(`Week ${week.week}: Weight must be a number ≥ 0`);
        }
        if (isNaN(sets) || sets < 0 || !Number.isInteger(sets)) {
          newErrors.push(`Week ${week.week}: Sets must be a whole number ≥ 0`);
        }
        if (isNaN(reps) || reps < 0 || !Number.isInteger(reps)) {
          newErrors.push(`Week ${week.week}: Reps must be a whole number ≥ 0`);
        }
      }
    });

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  // Change to 5 if you want: Math.round(weight / 5) * 5
  const roundToNearestPlate = (weight: number): number => {
    return Math.round(weight / 2.5) * 2.5;
  };

  const calculateRecommendation = (): Recommendation => {
    const parsed = weekData.map((w) => {
      const weight = parseFloat(w.weight);
      const sets = parseInt(w.sets, 10);
      const reps = parseInt(w.reps, 10);
      return { week: w.week, weight, sets, reps, volume: weight * sets * reps };
    });

    const last = parsed[3];
    const prev = parsed[2];

    const weights = parsed.map((w) => w.weight);
    const volumes = parsed.map((w) => w.volume);

    const weightIncreasedEveryWeek =
      weights[1] > weights[0] && weights[2] > weights[1] && weights[3] > weights[2];

    let nextWeight: number;
    if (weightIncreasedEveryWeek) {
      const lastIncrease = last.weight - prev.weight;
      nextWeight = last.weight + lastIncrease;
    } else {
      nextWeight = last.weight + 2.5;
    }

    nextWeight = roundToNearestPlate(nextWeight);

    const totalWeightIncrease = weights[3] - weights[0];
    const avgWeeklyIncrease = totalWeightIncrease / 3;

    const volumeTrendPositive =
      volumes[1] >= volumes[0] && volumes[2] >= volumes[1] && volumes[3] >= volumes[2];

    const progressionStalled = weights[1] === weights[2] && weights[2] === weights[3];

    const explanations: string[] = [];

    if (weightIncreasedEveryWeek) {
      explanations.push(
        `Weight increased each week (avg +${avgWeeklyIncrease.toFixed(1)} lb/week) — continuing the same progression rate.`
      );
    } else if (progressionStalled) {
      explanations.push(`Weight has been flat for multiple weeks — applying a small +2.5 lb nudge to restart progress.`);
    } else {
      explanations.push(`Mixed progression pattern — using a conservative +2.5 lb increase to maintain momentum.`);
    }

    if (volumeTrendPositive) {
      explanations.push(`Training volume is trending upward — good sign of adaptation without obvious fatigue signals.`);
    } else {
      explanations.push(`Training volume fluctuated — holding the same set/rep scheme to consolidate before pushing harder.`);
    }

    explanations.push(
      `Prescription keeps Week 4 sets/reps and adjusts load to drive progressive overload with minimal risk.`
    );

    return {
      weight: nextWeight,
      sets: last.sets,
      reps: last.reps,
      explanations,
    };
  };

  const handleGenerateWeek5 = () => {
    if (!validateInputs()) {
      setShowResult(false);
      return;
    }

    const rec = calculateRecommendation();
    setRecommendation(rec);
    setShowResult(true);

    setTimeout(() => {
      document.getElementById('result-section')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Workout Intelligence Demo</h1>
          <p className="text-slate-600">
            Enter your last 4 weeks of training data to get a Week 5 prescription
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
          <div className="mb-8">
            <label htmlFor="exercise-name" className="block text-sm font-semibold text-slate-700 mb-2">
              Exercise
            </label>
            <input
              id="exercise-name"
              type="text"
              value={exerciseName}
              onChange={(e) => setExerciseName(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-slate-900"
              placeholder="e.g., Back Squat"
            />
          </div>

          <div className="mb-8">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Training History</h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Week</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Weight (lb)</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Sets</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Reps</th>
                  </tr>
                </thead>
                <tbody>
                  {weekData.map((week, index) => (
                    <tr key={week.week} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-medium text-slate-900">Week {week.week}</td>
                      <td className="py-3 px-4">
                        <input
                          type="number"
                          value={week.weight}
                          onChange={(e) => handleWeekDataChange(index, 'weight', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-slate-900"
                          placeholder="e.g., 205"
                          min="0"
                          step="2.5"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="number"
                          value={week.sets}
                          onChange={(e) => handleWeekDataChange(index, 'sets', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-slate-900"
                          placeholder="e.g., 3"
                          min="0"
                          step="1"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="number"
                          value={week.reps}
                          onChange={(e) => handleWeekDataChange(index, 'reps', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-slate-900"
                          placeholder="e.g., 5"
                          min="0"
                          step="1"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {errors.length > 0 && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <h3 className="text-sm font-semibold text-red-800 mb-2">Please fix the following errors:</h3>
              <ul className="list-disc list-inside space-y-1">
                {errors.map((error, index) => (
                  <li key={index} className="text-sm text-red-700">
                    {error}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button
            onClick={handleGenerateWeek5}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg"
          >
            Generate Week 5 Recommendation
          </button>
        </div>

        {showResult && recommendation && (
          <div id="result-section" className="bg-white rounded-xl shadow-lg p-8 border-l-4 border-blue-600">
            <div className="flex items-start mb-4">
              <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-slate-900 mb-1">Week 5 Prescription</h2>
                <p className="text-slate-600">Based on your progression pattern</p>
              </div>
            </div>

            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 mb-6">
              <div className="text-center">
                <div className="text-sm font-medium text-slate-600 mb-2">{exerciseName}</div>
                <div className="text-5xl font-bold text-slate-900 mb-2">
                  {recommendation.weight} <span className="text-2xl text-slate-600">lb</span>
                </div>
                <div className="text-xl text-slate-700">
                  {recommendation.sets} sets × {recommendation.reps} reps
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-3">Why this recommendation?</h3>
              <ul className="space-y-3">
                {recommendation.explanations.map((explanation, index) => (
                  <li key={index} className="flex items-start">
                    <span className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                      <span className="text-blue-600 text-sm font-bold">{index + 1}</span>
                    </span>
                    <span className="text-slate-700">{explanation}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-200">
              <p className="text-sm text-slate-500 italic">
                Deterministic recommendation based on your last 4 weeks of logged training.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
