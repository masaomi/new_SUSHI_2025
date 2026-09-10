"""OMAKASE prototype core — plain code that drives a chain of existing SUSHI Apps.

Implements the first vertical slice of `docs/omakase-auto-analysis-design.md` v0.3 as
amended by `docs/omakase-prototype-design-delta.md`. No model is involved anywhere in this
package; design decision D4 keeps the trigger, the timer and every state transition in
ordinary code so that the order of events cannot depend on a model's judgement.
"""
__all__ = ["store", "sushi", "runner", "recipes"]
