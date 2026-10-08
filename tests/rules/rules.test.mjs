// Security-rules tests for MoraConnect (firestore.rules + storage.rules).
// Runs against the local emulators only, under a demo- project id, so it never
// touches real data:   npm run test:rules
// Needs the Firebase CLI (npm i -g firebase-tools) and Java 11+.
import { readFileSync } from 'node:fs';
import {
  initializeTestEnvironment, assertSucceeds, assertFails,
} from '@firebase/rules-unit-testing';

const testEnv = await initializeTestEnvironment({
  projectId: 'demo-moraleo',
  firestore: { rules: readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8'), host: '127.0.0.1', port: 8181 },
  storage:   { rules: readFileSync(new URL('../../storage.rules', import.meta.url), 'utf8'),   host: '127.0.0.1', port: 9198 },
});

const MEMBERS = {
  'active@x.com':   { fullName: 'Active',   role: 'member',     isActive: true  },
  'inactive@x.com': { fullName: 'Inactive', role: 'member',     isActive: false },
  'admin@x.com':    { fullName: 'Admin',    role: 'secretary',  isActive: true  },
  'exadmin@x.com':  { fullName: 'ExAdmin',  role: 'secretary',  isActive: false },
  'super@x.com':    { fullName: 'Super',    role: 'superAdmin', isActive: true  },
  'victim@x.com':   { fullName: 'Victim',   role: 'member',     isActive: true  },
};
const PNG = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

await testEnv.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore();
  for (const [email, d] of Object.entries(MEMBERS)) await db.doc(`members/${email}`).set({ ...d, email, profilePhoto: '' });
  await db.doc('events/e1').set({ title: 'Blood donation' });
  await db.doc('attendance/a1').set({ memberId: 'active@x.com', eventId: 'e1', status: 'attended' });
  await db.doc('attendance/a2').set({ memberId: 'other@x.com',  eventId: 'e1', status: 'attended' });
  await db.doc('attendance/a3').set({ memberId: 'inactive@x.com', eventId: 'e1', status: 'attended' });
  await db.doc('memberPoints/p1').set({ memberId: 'active@x.com', points: 5 });
  await db.doc('projects/pr1').set({ name: 'Blood Donation', imageUrl: '', roles: { chairperson: { key: 'k1', name: 'A' } } });
  await db.doc('orientation/o1').set({ title: 'Club history', url: 'https://firebasestorage.googleapis.com/v0/b/x/o/a', storagePath: 'orientation/o1/guide.pdf' });
  await db.doc('members/leaver@x.com').set({ fullName: 'Leaver', role: 'member', isActive: true, email: 'leaver@x.com' });
  await db.doc('attendance/L1').set({ memberId: 'leaver@x.com', eventId: 'e1', status: 'attended' });
  await db.doc('memberPoints/L2').set({ memberId: 'leaver@x.com', points: 3 });
  const st = ctx.storage();
  await st.ref('profiles/active@x.com/photo').put(PNG, { contentType: 'image/png' });
  await st.ref('events/e1/pic.png').put(PNG, { contentType: 'image/png' });
  await st.ref('projects/pr1/cover.png').put(PNG, { contentType: 'image/png' });
  await st.ref('orientation/o1/guide.pdf').put(PNG, { contentType: 'application/pdf' });
  await st.ref('profiles/leaver@x.com/photo').put(PNG, { contentType: 'image/png' });
});

const as = (email) => email
  ? testEnv.authenticatedContext(email.split('@')[0], { email })
  : testEnv.unauthenticatedContext();

let pass = 0, fail = 0;
async function check(label, expect, fn) {
  try {
    await (expect === 'allow' ? assertSucceeds(fn()) : assertFails(fn()));
    pass++; console.log(`  ok    ${expect.padEnd(5)} ${label}`);
  } catch (e) {
    fail++; console.log(`  FAIL  ${expect.padEnd(5)} ${label}  -> ${e.message.split('\n')[0]}`);
  }
}
const fs = (email) => as(email).firestore();
const st = (email) => as(email).storage();

console.log('Firestore — events');
await check('not logged in reads events',             'deny',  () => fs(null).doc('events/e1').get());
await check('stranger (self-signed-up) reads events', 'deny',  () => fs('stranger@x.com').doc('events/e1').get());
await check('active member reads events',             'allow', () => fs('active@x.com').doc('events/e1').get());
await check('active member lists events',             'allow', () => fs('active@x.com').collection('events').get());
await check('deactivated member reads events',        'deny',  () => fs('inactive@x.com').doc('events/e1').get());
await check('active admin creates event',             'allow', () => fs('admin@x.com').collection('events').add({ title: 'x' }));
await check('deactivated admin creates event',        'deny',  () => fs('exadmin@x.com').collection('events').add({ title: 'x' }));
await check('active member creates event',            'deny',  () => fs('active@x.com').collection('events').add({ title: 'x' }));

console.log('Firestore — attendance & points');
await check('member reads own attendance',            'allow', () => fs('active@x.com').doc('attendance/a1').get());
await check('member queries own attendance',          'allow', () => fs('active@x.com').collection('attendance').where('memberId', '==', 'active@x.com').get());
await check("member reads someone else's attendance", 'deny',  () => fs('active@x.com').doc('attendance/a2').get());
await check('deactivated member reads own attendance','deny',  () => fs('inactive@x.com').doc('attendance/a3').get());
await check('active admin reads any attendance',      'allow', () => fs('admin@x.com').doc('attendance/a2').get());
await check('deactivated admin reads any attendance', 'deny',  () => fs('exadmin@x.com').doc('attendance/a2').get());
await check('deactivated admin writes attendance',    'deny',  () => fs('exadmin@x.com').doc('attendance/a2').update({ status: 'absent' }));
await check('admin lists ALL attendance (leaderboard)', 'allow', () => fs('admin@x.com').collection('attendance').get());
await check('member lists ALL attendance',            'deny',  () => fs('active@x.com').collection('attendance').get());
await check('admin lists ALL manual points',          'allow', () => fs('admin@x.com').collection('memberPoints').get());
await check('member reads own points',                'allow', () => fs('active@x.com').doc('memberPoints/p1').get());
await check('stranger reads points',                  'deny',  () => fs('stranger@x.com').doc('memberPoints/p1').get());
await check('deactivated admin adds points',          'deny',  () => fs('exadmin@x.com').collection('memberPoints').add({ memberId: 'active@x.com', points: 99 }));
await check('active admin adds points',               'allow', () => fs('admin@x.com').collection('memberPoints').add({ memberId: 'active@x.com', points: 1 }));

console.log('Firestore — members');
await check('member reads own record',                'allow', () => fs('active@x.com').doc('members/active@x.com').get());
await check('deactivated member reads own record (app needs it to sign them out)', 'allow', () => fs('inactive@x.com').doc('members/inactive@x.com').get());
await check("member reads another member's record",   'deny',  () => fs('active@x.com').doc('members/admin@x.com').get());
await check('active admin lists all members',         'allow', () => fs('admin@x.com').collection('members').orderBy('fullName').get());
await check('deactivated admin lists all members',    'deny',  () => fs('exadmin@x.com').collection('members').orderBy('fullName').get());
await check('member sets own photo to a Storage URL',  'allow', () => fs('active@x.com').doc('members/active@x.com').update({ profilePhoto: 'https://firebasestorage.googleapis.com/v0/b/moraleoportal.firebasestorage.app/o/profiles%2Factive%40x.com%2Fphoto?alt=media&token=abc' }));
await check('member clears own photo',               'allow', () => fs('active@x.com').doc('members/active@x.com').update({ profilePhoto: '' }));
await check('member sets own photo to outside URL',   'deny',  () => fs('active@x.com').doc('members/active@x.com').update({ profilePhoto: 'https://tracker.example/p.png' }));
await check('member sets own photo to javascript:',   'deny',  () => fs('active@x.com').doc('members/active@x.com').update({ profilePhoto: 'javascript:alert(1)' }));
await check('member sets own photo to a non-string',  'deny',  () => fs('active@x.com').doc('members/active@x.com').update({ profilePhoto: 42 }));
await check('admin sets a member photo URL (admin feature)', 'allow', () => fs('admin@x.com').doc('members/active@x.com').update({ profilePhoto: 'https://example.com/p.jpg' }));
await check('member makes self secretary',            'deny',  () => fs('active@x.com').doc('members/active@x.com').update({ role: 'secretary' }));
await check('member reactivates self',                'deny',  () => fs('inactive@x.com').doc('members/inactive@x.com').update({ isActive: true }));
await check('deactivated member changes own photo',   'deny',  () => fs('inactive@x.com').doc('members/inactive@x.com').update({ profilePhoto: 'https://firebasestorage.googleapis.com/v0/b/moraleoportal.firebasestorage.app/o/profiles%2Factive%40x.com%2Fphoto?alt=media&token=abc' }));
await check('deactivated admin reactivates self',     'deny',  () => fs('exadmin@x.com').doc('members/exadmin@x.com').update({ isActive: true }));
await check('active admin deactivates a member',      'allow', () => fs('admin@x.com').doc('members/victim@x.com').update({ isActive: false }));
await check('active admin adds a member',             'allow', () => fs('admin@x.com').doc('members/new@x.com').set({ fullName: 'New', role: 'member', isActive: true }));
await check('active admin adds a superAdmin',         'deny',  () => fs('admin@x.com').doc('members/new2@x.com').set({ fullName: 'N2', role: 'superAdmin', isActive: true }));
await check('active admin edits the superAdmin',      'deny',  () => fs('admin@x.com').doc('members/super@x.com').update({ isActive: false }));
await check('superAdmin adds a superAdmin',           'allow', () => fs('super@x.com').doc('members/new3@x.com').set({ fullName: 'N3', role: 'superAdmin', isActive: true }));
await check('stranger creates a member record',       'deny',  () => fs('stranger@x.com').doc('members/stranger@x.com').set({ fullName: 'S', role: 'member', isActive: true }));

console.log('Storage — photos');
await check('not logged in reads profile photo',      'deny',  () => st(null).ref('profiles/active@x.com/photo').getMetadata());
await check('stranger reads profile photo',           'deny',  () => st('stranger@x.com').ref('profiles/active@x.com/photo').getMetadata());
await check('active member reads profile photo',      'allow', () => st('admin@x.com').ref('profiles/active@x.com/photo').getMetadata());
await check('deactivated member reads profile photo', 'deny',  () => st('inactive@x.com').ref('profiles/active@x.com/photo').getMetadata());
await check('stranger reads event photo',             'deny',  () => st('stranger@x.com').ref('events/e1/pic.png').getMetadata());
await check('active member reads event photo',        'allow', () => st('active@x.com').ref('events/e1/pic.png').getMetadata());
await check('member uploads own profile photo',       'allow', () => st('active@x.com').ref('profiles/active@x.com/photo').put(PNG, { contentType: 'image/png' }));
await check("member uploads someone else's photo",    'deny',  () => st('active@x.com').ref('profiles/admin@x.com/photo').put(PNG, { contentType: 'image/png' }));
await check('stranger uploads a profile photo',       'deny',  () => st('stranger@x.com').ref('profiles/stranger@x.com/photo').put(PNG, { contentType: 'image/png' }));
await check('member uploads JPEG profile photo',      'allow', () => st('active@x.com').ref('profiles/active@x.com/photo').put(PNG, { contentType: 'image/jpeg' }));
await check('member uploads SVG profile photo',       'deny',  () => st('active@x.com').ref('profiles/active@x.com/photo').put(PNG, { contentType: 'image/svg+xml' }));
await check('admin uploads SVG event photo',          'deny',  () => st('admin@x.com').ref('events/e1/z.svg').put(PNG, { contentType: 'image/svg+xml' }));
await check('member uploads a non-image',             'deny',  () => st('active@x.com').ref('profiles/active@x.com/photo').put(PNG, { contentType: 'text/html' }));
await check('active admin uploads event photo',       'allow', () => st('admin@x.com').ref('events/e1/new.png').put(PNG, { contentType: 'image/png' }));
await check('deactivated admin uploads event photo',  'deny',  () => st('exadmin@x.com').ref('events/e1/x.png').put(PNG, { contentType: 'image/png' }));
await check('active member uploads event photo',      'deny',  () => st('active@x.com').ref('events/e1/y.png').put(PNG, { contentType: 'image/png' }));
await check('deactivated admin deletes event photo',  'deny',  () => st('exadmin@x.com').ref('events/e1/pic.png').delete());

console.log('Remove member (Super Admin only)');
await check('secretary removes a member',               'deny',  () => fs('admin@x.com').doc('members/leaver@x.com').delete());
await check('secretary deletes a member photo',         'deny',  () => st('admin@x.com').ref('profiles/leaver@x.com/photo').delete());
await check('member deletes own photo directly',        'deny',  () => st('active@x.com').ref('profiles/active@x.com/photo').delete());
await check('superAdmin finds member attendance',       'allow', () => fs('super@x.com').collection('attendance').where('memberId','==','leaver@x.com').get());
await check('superAdmin finds member points',           'allow', () => fs('super@x.com').collection('memberPoints').where('memberId','==','leaver@x.com').get());
await check('superAdmin deletes member attendance',     'allow', () => fs('super@x.com').doc('attendance/L1').delete());
await check('superAdmin deletes member points',         'allow', () => fs('super@x.com').doc('memberPoints/L2').delete());
await check('superAdmin removes the member record',     'allow', () => fs('super@x.com').doc('members/leaver@x.com').delete());
await check('superAdmin deletes the member photo',      'allow', () => st('super@x.com').ref('profiles/leaver@x.com/photo').delete());
await check('superAdmin removes themselves',            'deny',  () => fs('super@x.com').doc('members/super@x.com').delete());
await check('removed member (login left) reads events', 'deny',  () => fs('leaver@x.com').doc('events/e1').get());

console.log('Orientation Program');
await check('active member lists orientation files',  'allow', () => fs('active@x.com').collection('orientation').orderBy('title').get());
await check('stranger lists orientation files',       'deny',  () => fs('stranger@x.com').collection('orientation').get());
await check('deactivated member lists orientation',   'deny',  () => fs('inactive@x.com').collection('orientation').get());
await check('secretary adds an orientation file',     'allow', () => fs('admin@x.com').doc('orientation/o2').set({ title: 'Guide', url: 'https://firebasestorage.googleapis.com/v0/b/moraleoportal.firebasestorage.app/o/orientation%2Fo2%2Fa.pdf?alt=media&token=t' }));
await check('member adds an orientation file',        'deny',  () => fs('active@x.com').doc('orientation/o3').set({ title: 'Guide', url: 'https://firebasestorage.googleapis.com/v0/b/moraleoportal.firebasestorage.app/o/orientation%2Fo2%2Fa.pdf?alt=media&token=t' }));
await check('secretary adds file with javascript url','deny',  () => fs('admin@x.com').doc('orientation/o4').set({ title: 'X', url: 'javascript:alert(1)' }));
await check('secretary adds file with empty title',   'deny',  () => fs('admin@x.com').doc('orientation/o5').set({ title: '', url: 'https://firebasestorage.googleapis.com/v0/b/moraleoportal.firebasestorage.app/o/orientation%2Fo2%2Fa.pdf?alt=media&token=t' }));
await check('member deletes an orientation file',     'deny',  () => fs('active@x.com').doc('orientation/o1').delete());
await check('deactivated admin deletes orientation',  'deny',  () => fs('exadmin@x.com').doc('orientation/o1').delete());
await check('active member opens orientation file',   'allow', () => st('active@x.com').ref('orientation/o1/guide.pdf').getMetadata());
await check('stranger opens orientation file',        'deny',  () => st('stranger@x.com').ref('orientation/o1/guide.pdf').getMetadata());
await check('secretary uploads a PDF',                'allow', () => st('admin@x.com').ref('orientation/o2/a.pdf').put(PNG, { contentType: 'application/pdf' }));
await check('secretary uploads a DOCX',               'allow', () => st('admin@x.com').ref('orientation/o2/b.docx').put(PNG, { contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }));
await check('secretary uploads a PPTX',               'allow', () => st('admin@x.com').ref('orientation/o2/c.pptx').put(PNG, { contentType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' }));
await check('secretary uploads an MP4',               'allow', () => st('admin@x.com').ref('orientation/o2/d.mp4').put(PNG, { contentType: 'video/mp4' }));
await check('secretary uploads HTML',                 'deny',  () => st('admin@x.com').ref('orientation/o2/e.html').put(PNG, { contentType: 'text/html' }));
await check('secretary uploads SVG',                  'deny',  () => st('admin@x.com').ref('orientation/o2/f.svg').put(PNG, { contentType: 'image/svg+xml' }));
await check('secretary uploads a 26 MB file',         'deny',  () => st('admin@x.com').ref('orientation/o2/g.pdf').put(new Uint8Array(26*1024*1024), { contentType: 'application/pdf' }));
await check('member uploads a PDF',                   'deny',  () => st('active@x.com').ref('orientation/o2/h.pdf').put(PNG, { contentType: 'application/pdf' }));
await check('member deletes an orientation file',     'deny',  () => st('active@x.com').ref('orientation/o1/guide.pdf').delete());
await check('secretary deletes an orientation file',  'allow', () => st('admin@x.com').ref('orientation/o1/guide.pdf').delete());
await check('secretary deletes orientation record',   'allow', () => fs('admin@x.com').doc('orientation/o1').delete());

console.log('Published leaderboard');
await check('secretary publishes leaderboard',        'allow', () => fs('admin@x.com').doc('leaderboard/current').set({ rows: [{ key: 'abc', name: 'A', position: '', eventPoints: 1, manualPoints: 0, total: 1, rank: 1 }] }));
await check('active member reads leaderboard',        'allow', () => fs('active@x.com').doc('leaderboard/current').get());
await check('stranger reads leaderboard',             'deny',  () => fs('stranger@x.com').doc('leaderboard/current').get());
await check('deactivated member reads leaderboard',   'deny',  () => fs('inactive@x.com').doc('leaderboard/current').get());
await check('member edits leaderboard',               'deny',  () => fs('active@x.com').doc('leaderboard/current').set({ rows: [] }));
await check('deactivated admin publishes leaderboard','deny',  () => fs('exadmin@x.com').doc('leaderboard/current').set({ rows: [] }));
await check('secretary publishes non-list rows',      'deny',  () => fs('admin@x.com').doc('leaderboard/current').set({ rows: 'x' }));

console.log('Projects');
await check('active member lists projects',          'allow', () => fs('active@x.com').collection('projects').get());
await check('stranger lists projects',               'deny',  () => fs('stranger@x.com').collection('projects').get());
await check('deactivated member lists projects',     'deny',  () => fs('inactive@x.com').collection('projects').get());
await check('secretary adds a project',              'allow', () => fs('admin@x.com').doc('projects/pr2').set({ name: 'Food Fair', imageUrl: '', roles: {} }));
await check('secretary adds project with image',     'allow', () => fs('admin@x.com').doc('projects/pr3').set({ name: 'X', imageUrl: 'https://firebasestorage.googleapis.com/v0/b/x/o/projects%2Fpr2%2Fa.png?alt=media&token=t', roles: {} }));
await check('secretary adds project, outside image', 'deny',  () => fs('admin@x.com').doc('projects/pr4').set({ name: 'X', imageUrl: 'https://evil.example/a.png', roles: {} }));
await check('secretary adds project, empty name',    'deny',  () => fs('admin@x.com').doc('projects/pr5').set({ name: '', imageUrl: '', roles: {} }));
await check('member adds a project',                 'deny',  () => fs('active@x.com').doc('projects/pr6').set({ name: 'Food Fair', imageUrl: '', roles: {} }));
await check('member gives self a project role',      'deny',  () => fs('active@x.com').doc('projects/pr1').update({ 'roles.secretary': { key: 'me', name: 'Me' } }));
await check('deactivated admin edits a project',     'deny',  () => fs('exadmin@x.com').doc('projects/pr1').update({ name: 'Hacked' }));
await check('member deletes a project',              'deny',  () => fs('active@x.com').doc('projects/pr1').delete());
await check('active member sees project image',      'allow', () => st('active@x.com').ref('projects/pr1/cover.png').getMetadata());
await check('stranger sees project image',           'deny',  () => st('stranger@x.com').ref('projects/pr1/cover.png').getMetadata());
await check('secretary uploads project image',       'allow', () => st('admin@x.com').ref('projects/pr2/a.png').put(PNG, { contentType: 'image/png' }));
await check('secretary uploads SVG project image',   'deny',  () => st('admin@x.com').ref('projects/pr2/b.svg').put(PNG, { contentType: 'image/svg+xml' }));
await check('member uploads project image',          'deny',  () => st('active@x.com').ref('projects/pr2/c.png').put(PNG, { contentType: 'image/png' }));
await check('secretary deletes project image',       'allow', () => st('admin@x.com').ref('projects/pr1/cover.png').delete());
await check('secretary deletes a project',           'allow', () => fs('admin@x.com').doc('projects/pr1').delete());

console.log('Notice Board');
await testEnv.withSecurityRulesDisabled(async (ctx) => {
  await ctx.firestore().doc('notices/n1').set({ title: 'Installation', description: '', imageUrl: '', link: '' });
  await ctx.storage().ref('notices/n1/card.png').put(PNG, { contentType: 'image/png' });
});
const notice = (extra = {}) => ({
  title: 'Beach Clean-up', description: 'Meet at 7 AM', place: 'Mount Lavinia',
  imageUrl: '', link: '', ...extra,
});
const STORAGE_URL = 'https://firebasestorage.googleapis.com/v0/b/x/o/notices%2Fn2%2Fa.png?alt=media&token=t';
await check('active member lists notices',           'allow', () => fs('active@x.com').collection('notices').get());
await check('stranger lists notices',                'deny',  () => fs('stranger@x.com').collection('notices').get());
await check('deactivated member lists notices',      'deny',  () => fs('inactive@x.com').collection('notices').get());
await check('secretary posts a notice',              'allow', () => fs('admin@x.com').doc('notices/n2').set(notice()));
await check('secretary posts notice with card+link', 'allow', () => fs('admin@x.com').doc('notices/n3').set(notice({ imageUrl: STORAGE_URL, link: 'https://forms.gle/abc' })));
await check('secretary posts notice, outside image', 'deny',  () => fs('admin@x.com').doc('notices/n4').set(notice({ imageUrl: 'https://evil.example/a.png' })));
await check('secretary posts notice, javascript link','deny', () => fs('admin@x.com').doc('notices/n5').set(notice({ link: 'javascript:alert(1)' })));
await check('secretary posts notice, http link',     'deny',  () => fs('admin@x.com').doc('notices/n6').set(notice({ link: 'http://example.com' })));
await check('secretary posts notice, empty title',   'deny',  () => fs('admin@x.com').doc('notices/n7').set(notice({ title: '' })));
await check('secretary posts notice, huge description','deny',() => fs('admin@x.com').doc('notices/n8').set(notice({ description: 'x'.repeat(3001) })));
await check('member posts a notice',                 'deny',  () => fs('active@x.com').doc('notices/n9').set(notice()));
await check('member edits a notice',                 'deny',  () => fs('active@x.com').doc('notices/n1').update({ title: 'Hacked' }));
await check('deactivated admin edits a notice',      'deny',  () => fs('exadmin@x.com').doc('notices/n1').update({ title: 'Hacked' }));
await check('member deletes a notice',               'deny',  () => fs('active@x.com').doc('notices/n1').delete());
await check('active member sees invitation card',    'allow', () => st('active@x.com').ref('notices/n1/card.png').getMetadata());
await check('stranger sees invitation card',         'deny',  () => st('stranger@x.com').ref('notices/n1/card.png').getMetadata());
await check('secretary uploads invitation card',     'allow', () => st('admin@x.com').ref('notices/n2/a.png').put(PNG, { contentType: 'image/png' }));
await check('secretary uploads SVG card',            'deny',  () => st('admin@x.com').ref('notices/n2/b.svg').put(PNG, { contentType: 'image/svg+xml' }));
await check('member uploads invitation card',        'deny',  () => st('active@x.com').ref('notices/n2/c.png').put(PNG, { contentType: 'image/png' }));
await check('secretary deletes invitation card',     'allow', () => st('admin@x.com').ref('notices/n1/card.png').delete());
await check('secretary deletes a notice',            'allow', () => fs('admin@x.com').doc('notices/n1').delete());

await testEnv.cleanup();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
