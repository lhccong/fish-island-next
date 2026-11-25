import { describe, expect, it } from 'vitest';
import {
  emptyPetCards,
  getPetCard,
  petCardGrades,
  petCardIds,
  petCardPacks,
  petCards,
  petCardsDay,
  remainingPetPacks,
  restorePetCardsProgress,
  summarizePetShowcase,
  unopenedPetPacks,
  updatePetCards,
  type PetCardsProgress,
} from './cards';

const day = '2026-11-22';

describe('pet card pack', () => {
  it('settles the first pack, including in-pack duplicates and the shiny guarantee', () => {
    const sealed = updatePetCards(emptyPetCards(), { type: 'claim' }, day);
    const opened = updatePetCards(
      sealed,
      { type: 'open', packId: 1, pack: 'island' },
      day,
      () => 0,
    );
    expect(opened.result?.cards.map((card) => card.points)).toEqual([0, 5, 5, 5, 0]);
    expect(opened.owned).toEqual(['radish', 'fox']);
    expect(getPetCard(opened.owned[1]!).grade).toBe('shiny');
    expect(opened.points).toBe(15);
    expect(() =>
      updatePetCards(opened, { type: 'open', packId: 1, pack: 'island' }, day),
    ).toThrow();
  });

  it('keeps one hundred unique cards across the two packs', () => {
    expect(petCardIds).toHaveLength(100);
    expect(petCardIds.map((id) => petCards[id].art)).toEqual(
      Array.from({ length: 100 }, (_, index) => index),
    );
  });

  it.each(['island', 'kingdoms'] as const)(
    'draws all fifty cards from %s with unchanged grade odds',
    (kind) => {
      const idsInPack = petCardPacks[kind].ids;
      expect(idsInPack).toHaveLength(50);
      const sealed = updatePetCards(
        { ...emptyPetCards(), owned: [idsInPack[0]!] },
        { type: 'claim', pack: kind },
        day,
      );
      let previousWeight = 0;
      for (const [grade, { weight }] of Object.entries(petCardGrades)) {
        const ids = idsInPack.filter((id) => getPetCard(id).grade === grade);
        expect(ids).toHaveLength(10);
        ids.forEach((id, index) => {
          const chance = (previousWeight + weight * ((index + 0.5) / ids.length)) / 100;
          const opened = updatePetCards(
            sealed,
            { type: 'open', packId: 1, pack: kind },
            day,
            () => chance,
          );
          expect(opened.result?.cards.map((card) => card.id)).toEqual(Array(5).fill(id));
        });
        previousWeight += weight;
      }
    },
  );

  it.each(['island', 'kingdoms'] as const)(
    'includes all ten shiny cards in the %s first-pack guarantee',
    (kind) => {
      const first = updatePetCards(emptyPetCards(), { type: 'claim', pack: kind }, day);
      const shinyIds = petCardPacks[kind].shinyIds;
      shinyIds.forEach((id, index) => {
        let calls = 0;
        const opened = updatePetCards(first, { type: 'open', packId: 1, pack: kind }, day, () =>
          ++calls === 5 ? (index + 0.5) / shinyIds.length : 0,
        );
        expect(opened.result?.cards.at(-1)?.id).toBe(id);
      });
    },
  );

  it('opens a legacy sealed pack and shares quota with the other pack', () => {
    const legacy = {
      day,
      claimed: 1,
      sealed: true,
      opened: 0,
      result: null,
      points: 0,
      owned: [],
      showcased: [],
    };
    const island = updatePetCards(
      restorePetCardsProgress(legacy),
      { type: 'open', packId: 1, pack: 'island' },
      day,
      () => 0,
    );
    expect(island.owned).toEqual(['radish', 'fox']);
    const finished = updatePetCards(island, { type: 'finish', packId: 1 }, day);
    const second = updatePetCards(finished, { type: 'claim', pack: 'kingdoms' }, day);
    expect(second.pack).toBe('kingdoms');
    expect(remainingPetPacks(second, day)).toBe(0);
    const kingdoms = updatePetCards(
      second,
      { type: 'open', packId: 2, pack: 'kingdoms' },
      day,
      () => 0,
    );
    expect(kingdoms.owned).toEqual(['radish', 'fox', 'jiangWan', 'zhugeLiang']);
    const complete = updatePetCards(kingdoms, { type: 'finish', packId: 2 }, day);
    expect(() => updatePetCards(complete, { type: 'claim', pack: 'island' }, day)).toThrow(
      '今日的免费卡包已领完',
    );
  });

  it('allows two claims per Shanghai date and keeps a claimed pack across midnight', () => {
    const before = petCardsDay(new Date('2026-11-22T15:59:59Z'));
    const after = petCardsDay(new Date('2026-11-22T16:00:00Z'));
    expect([before, after]).toEqual(['2026-11-22', '2026-11-23']);
    const first = updatePetCards(emptyPetCards(), { type: 'claim' }, before);
    const result = updatePetCards(
      first,
      { type: 'open', packId: 1, pack: 'island' },
      before,
      () => 0,
    );
    const finished = updatePetCards(result, { type: 'finish', packId: 1 }, before);
    const second = updatePetCards(finished, { type: 'claim' }, before);
    expect(remainingPetPacks(second, before)).toBe(0);
    expect(remainingPetPacks(second, after)).toBe(2);
    const nextDayResult = updatePetCards(
      second,
      { type: 'open', packId: 2, pack: 'island' },
      after,
      () => 0,
    );
    expect(nextDayResult.points).toBe(40);
    expect(updatePetCards(nextDayResult, { type: 'finish', packId: 1 }, after)).toBe(nextDayResult);
    const nextDayFinished = updatePetCards(nextDayResult, { type: 'finish', packId: 2 }, after);
    expect(() => updatePetCards(nextDayFinished, { type: 'claim' }, before)).toThrow(
      '今日的免费卡包已领完',
    );
    expect(updatePetCards(nextDayFinished, { type: 'claim' }, after).claimed).toBe(1);
  });

  it('accumulates inventory by pack across Shanghai dates and consumes exactly one on open', () => {
    const island = { type: 'claim', pack: 'island' } as const;
    const kingdoms = { type: 'claim', pack: 'kingdoms' } as const;
    const first = updatePetCards(emptyPetCards(), island, day);
    const second = updatePetCards(first, kingdoms, day);
    expect(() => updatePetCards(second, island, day)).toThrow('今日的免费卡包已领完');
    const after = '2026-11-23';
    const stocked = updatePetCards(second, island, after);
    expect(stocked.unopened).toEqual({ island: 2, kingdoms: 1 });
    const open = { type: 'open', pack: 'kingdoms', packId: 1 } as const;
    const result = updatePetCards(stocked, open, after, () => 0);
    expect(result.result?.pack).toBe('kingdoms');
    expect(result.owned).toEqual(['jiangWan', 'zhugeLiang']);
    expect(unopenedPetPacks(result, 'island')).toBe(2);
    expect(unopenedPetPacks(result, 'kingdoms')).toBe(0);
    expect(remainingPetPacks(result, after)).toBe(1);
    expect(() =>
      updatePetCards(result, { type: 'open', pack: 'island', packId: 2 }, after),
    ).toThrow('请先完成当前卡包');
  });

  it('restores the pack type of an old pending result', () => {
    const cards = [{ id: 'zhugeLiang', points: 0 }];
    const legacy = {
      day,
      claimed: 1,
      sealed: false,
      pack: 'kingdoms',
      opened: 3,
      result: { id: 3, cards },
      points: 15,
      owned: ['zhugeLiang'],
      showcased: ['zhugeLiang'],
    };
    const restored = restorePetCardsProgress(legacy);
    expect(restored.result).toEqual({ id: 3, pack: 'kingdoms', cards });
    expect(restored.unopened).toEqual({});
    expect(restored.showcased).toEqual(legacy.showcased);
    expect(restored.points).toBe(15);
  });

  it('allows six distinct collected cards and frees a slot when one is removed', () => {
    const progress: PetCardsProgress = { ...emptyPetCards(), owned: petCardIds.slice(0, 7) };
    const firstSix = progress.owned.slice(0, 6);
    const seventh = progress.owned[6]!;
    const displayed = firstSix.reduce(
      (album, id) => updatePetCards(album, { type: 'display', id }, day),
      progress,
    );
    expect(displayed.showcased).toEqual(firstSix);
    expect(updatePetCards(displayed, { type: 'display', id: 'radish' }, day)).toBe(displayed);
    expect(() => updatePetCards(displayed, { type: 'display', id: seventh }, day)).toThrow(
      '展示柜已满',
    );
    expect(() => updatePetCards(displayed, { type: 'display', id: 'fox' }, day)).toThrow(
      '请先收藏',
    );
    const removed = updatePetCards(displayed, { type: 'remove', id: 'crab' }, day);
    expect(updatePetCards(removed, { type: 'display', id: seventh }, day).showcased).toEqual([
      ...firstSix.filter((id) => id !== 'crab'),
      seventh,
    ]);
  });

  it.each(['island', 'kingdoms'] as const)(
    'resolves %s ordinary actions after reveal and all effects next turn',
    (kind) => {
      const cards = petCardPacks[kind].ids.map((id) => getPetCard(id));
      const actions = cards.filter((card) => card.grade === 'common').map((card) => card.battle);
      expect(actions.filter(({ action }) => action === 'attack')).toHaveLength(5);
      expect(actions.filter(({ action }) => action === 'dodge')).toHaveLength(5);
      expect(actions.every(({ phase }) => phase === 'afterReveal')).toBe(true);
      const effects = cards.flatMap(({ battle }) => (battle.kind === 'effect' ? [battle] : []));
      expect(effects).toHaveLength(40);
      expect(effects.every(({ turnOffset }) => turnOffset === 1)).toBe(true);
      const fine = cards.filter(({ grade }) => grade === 'fine');
      expect(fine).toHaveLength(10);
      for (const card of fine) {
        expect(card.battle).toMatchObject({
          trigger: { kind: 'turnStart' },
          outcome: { kind: 'heal', maxHealthPercent: 6 },
        });
      }
    },
  );

  it('records battle effect timing and numeric units independently of base stats', () => {
    expect(petCards.lion.battle).toMatchObject({
      trigger: { kind: 'turnStart' },
      outcome: { kind: 'criticalChanceBoost', percentagePoints: 10 },
    });
    expect(petCards.whale.battle).toMatchObject({
      trigger: { kind: 'turnStart' },
      outcome: { kind: 'statBoost', stats: ['attack'], percent: 10 },
    });
    expect(petCards.fox.battle).toMatchObject({
      turnOffset: 1,
      trigger: { kind: 'firstHit' },
      outcome: { kind: 'guaranteedCriticalHit' },
    });
    expect(petCards.xiahouDun.battle).toMatchObject({
      trigger: { kind: 'healthBelowAtTurnStart', thresholdPercent: 30 },
      outcome: { kind: 'statBoost', stats: ['defense'], percent: 25 },
    });
    expect(summarizePetShowcase(['radish', 'fox', 'whale'])).toEqual({
      attack: 60,
      defense: 25,
      health: 255,
      speed: 24,
    });
  });

  it('resets the current collection and rejects actions from before the reset', () => {
    const first = updatePetCards(emptyPetCards(), { type: 'claim' }, day);
    const result = updatePetCards(first, { type: 'open', packId: 1, pack: 'island' }, day, () => 0);
    const displayed = updatePetCards(result, { type: 'display', id: 'fox' }, day);
    const reset = updatePetCards(displayed, { type: 'reset' }, day);
    expect(reset).toEqual({ ...emptyPetCards(), opened: 2 });
    expect(remainingPetPacks(reset, day)).toBe(2);
    const next = updatePetCards(reset, { type: 'claim' }, day);
    expect(() => updatePetCards(next, { type: 'open', packId: 2, pack: 'island' }, day)).toThrow();
    const nextResult = updatePetCards(
      next,
      { type: 'open', packId: 3, pack: 'island' },
      day,
      () => 0,
    );
    expect(nextResult.result?.cards.at(-1)?.id).toBe('fox');
    expect(updatePetCards(nextResult, { type: 'finish', packId: 1 }, day)).toBe(nextResult);
  });
});
