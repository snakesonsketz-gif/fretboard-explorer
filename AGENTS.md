<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Jam visualization uses pitch-class roles from `jamVisualization.ts` for both layouts; only visible scale/arpeggio intersections are targets, so board layout and enharmonic spelling cannot change membership.
- Extend the shared Neck renderer with opt-in Jam tones rather than duplicating it; other sections retain their existing dot treatments.
