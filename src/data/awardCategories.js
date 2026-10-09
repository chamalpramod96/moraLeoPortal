/**
 * Project award categories (Project Awards page, admins only). Each category
 * takes up to NOMINATIONS_PER_CATEGORY project nominations and a comment.
 *
 * The `id` is the Firestore document key for that category's nominations
 * (awardNominations/{id}) — never change or reuse an id; to rename a
 * category, change only its label.
 */
export const NOMINATIONS_PER_CATEGORY = 3;

export const AWARD_GROUPS = [
  {
    id: 'projects',
    title: 'Projects Awards',
    categories: [
      { id: 'a01', no: 1,  label: 'Best Project for Spotlight on Children' },
      { id: 'a02', no: 2,  label: 'Best Project for Responsible Consumption & Waste Management' },
      { id: 'a03', no: 3,  label: 'Best Project for Nutrition & Food Safety' },
      { id: 'a04', no: 4,  label: 'Best Project for Peace & Cultural Activities' },
      { id: 'a05', no: 5,  label: 'Best Project for Sports & Recreation' },
      { id: 'a06', no: 6,  label: 'Best Project for Senior Citizens Development' },
      { id: 'a07', no: 7,  label: 'Best Project for Helping Hand to Differently Abled' },
      { id: 'a08', no: 8,  label: 'Best Project for Public Relations' },
      { id: 'a09', no: 9,  label: 'Best Project for Fundraiser' },
      { id: 'a10', no: 10, label: 'Best Project for Quality Education & Literacy' },
      { id: 'a11', no: 11, label: 'Best Project for Women Empowerment' },
      { id: 'a12', no: 12, label: 'Best Project for Poverty & Better Life' },
      { id: 'a13', no: 13, label: 'Best Project for Clean Water & Energy Conservation' },
      { id: 'a14', no: 14, label: 'Best Project for Crime & Accident Prevention' },
      { id: 'a15', no: 15, label: 'Best Project for Infrastructure Development' },
      { id: 'a16', no: 16, label: 'Best Project for Research & Development' },
      { id: 'a17', no: 17, label: 'Best Project for Drug Prevention & Rehabilitation' },
      { id: 'a18', no: 18, label: 'Best Project for Street Animals, Wildlife & Life Below Water' },
      { id: 'a19', no: 19, label: 'Best Project for Fellowship' },
      { id: 'a20', no: 20, label: 'Best Project for Betterment of Leoism' },
      { id: 'a21', no: 21, label: 'Most Outstanding Service Project' },
      { id: 'a22', no: 22, label: 'Most Innovative Project' },
      { id: 'a23', no: 23, label: 'Most Outstanding Continuous Project' },
      { id: 'a24', no: 24, label: 'Most Outstanding Project by a New Leo' },
    ],
  },
  {
    id: 'joint',
    title: 'Joint Projects Awards',
    categories: [
      { id: 'a25', no: 25, label: 'Best Serving Together Project (Joint Project with Lions Club/Sponsoring Lions Club)' },
      { id: 'a26', no: 26, label: 'Best Joint Project with Non-Leo/Outside Organization' },
      { id: 'a27', no: 27, label: 'Best Joint Inter-District Project (Joint Project Between Leo Clubs from Different Leo Districts)' },
      { id: 'a28', no: 28, label: 'Best Joint Intra-District Project (Joint Projects Between Leo Clubs of the Same Leo District)' },
      { id: 'a29', no: 29, label: 'Joint Projects with Foreign Leo Clubs/Best International Joint Project' },
      { id: 'a30', no: 30, label: 'Most Outstanding Joint Service Project' },
    ],
  },
  {
    id: 'lions-global',
    title: 'Lions Global Causes Awards',
    categories: [
      { id: 'a31', no: 31, label: 'Best Project for Diabetes' },
      { id: 'a32', no: 32, label: 'Best Project for the Environment' },
      { id: 'a33', no: 33, label: 'Best Project for Hunger' },
      { id: 'a34', no: 34, label: 'Best Project for Childhood Cancer' },
      { id: 'a35', no: 35, label: 'Best Project for Vision' },
      { id: 'a36', no: 36, label: 'Best Project for Youth' },
      { id: 'a37', no: 37, label: 'Best Project for Disaster Management and Prevention' },
    ],
  },
];

/** Every category in display order. */
export const AWARD_CATEGORIES = AWARD_GROUPS.flatMap(g => g.categories);
