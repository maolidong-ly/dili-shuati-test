-- 增加题型：判断题（正确 / 错误）

alter table public.questions drop constraint if exists questions_question_type_check;
alter table public.questions
  add constraint questions_question_type_check
  check (question_type in ('single', 'multiple', 'judgment'));

alter table public.questions drop constraint if exists questions_single_answer;
alter table public.questions
  add constraint questions_single_answer check (
    (question_type = 'single' and correct_single is not null and correct_multiple is null)
    or (
      question_type = 'multiple'
      and correct_multiple is not null
      and array_length(correct_multiple, 1) >= 2
    )
    or (
      question_type = 'judgment'
      and correct_single is not null
      and correct_single in (0, 1)
      and correct_multiple is null
    )
  );
