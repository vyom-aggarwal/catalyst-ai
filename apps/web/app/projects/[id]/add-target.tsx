'use client'

import type { Route } from 'next'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import { createTargetAction } from '@/app/actions'
import { InlineError } from '@/components/inline-error'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/toast'

export function AddTarget({ projectId }: { projectId: string }) {
  const router = useRouter()
  const toast = useToast()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<{ message: string; remedy: string } | null>(null)

  const [accession, setAccession] = useState('')
  const [name, setName] = useState('')
  const [organism, setOrganism] = useState('')
  const [text, setText] = useState('')

  function submit(
    input:
      | { source: 'uniprot'; accession: string }
      | { source: 'sequence'; name: string; text: string; organism?: string },
  ) {
    setError(null)
    startTransition(async () => {
      const result = await createTargetAction(projectId, input)
      if (!result.ok) {
        setError({ message: result.message, remedy: result.remedy })
        return
      }
      toast({ title: 'Target loaded', description: 'Reconcile its numbering next.' })
      router.push(`/targets/${result.data.id}` as Route)
    })
  }

  return (
    <div className="border-border rounded-panel max-w-2xl border p-4">
      <h3 className="text-13 font-strong mb-3">Add a target</h3>

      <Tabs defaultValue="uniprot">
        <TabsList>
          <TabsTrigger value="uniprot">Fetch by accession</TabsTrigger>
          <TabsTrigger value="paste">Paste sequence</TabsTrigger>
        </TabsList>

        <TabsContent value="uniprot">
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault()
              submit({ source: 'uniprot', accession })
            }}
          >
            <label className="block space-y-1">
              <span className="text-11 text-text-muted block font-medium uppercase tracking-wide">
                UniProt accession
              </span>
              <Input
                mono
                value={accession}
                onChange={(event) => setAccession(event.target.value)}
                placeholder="P62593"
                aria-label="UniProt accession"
                className="max-w-56"
              />
              <span className="text-12 text-text-faint block">
                The sequence, organism and any signal peptide are read from the record. A declared
                signal peptide is offered as a second numbering scheme.
              </span>
            </label>
            {error ? <InlineError message={error.message} remedy={error.remedy} /> : null}
            <Button type="submit" variant="primary" disabled={pending || !accession.trim()}>
              {pending ? 'Fetching…' : 'Fetch target'}
            </Button>
          </form>
        </TabsContent>

        <TabsContent value="paste">
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault()
              submit({ source: 'sequence', name, text, organism })
            }}
          >
            <div className="flex gap-3">
              <label className="block flex-1 space-y-1">
                <span className="text-11 text-text-muted block font-medium uppercase tracking-wide">
                  Name
                </span>
                <Input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Taken from the FASTA header if left blank"
                  aria-label="Target name"
                />
              </label>
              <label className="block flex-1 space-y-1">
                <span className="text-11 text-text-muted block font-medium uppercase tracking-wide">
                  Organism
                </span>
                <Input
                  value={organism}
                  onChange={(event) => setOrganism(event.target.value)}
                  aria-label="Organism"
                />
              </label>
            </div>
            <label className="block space-y-1">
              <span className="text-11 text-text-muted block font-medium uppercase tracking-wide">
                Sequence
              </span>
              <textarea
                value={text}
                onChange={(event) => setText(event.target.value)}
                aria-label="Sequence"
                rows={6}
                placeholder={'>optional header\nMSIQHFRVALIPFFAAFCLPVFA…'}
                className="border-border bg-surface text-13 text-text placeholder:text-text-faint hover:border-border-strong rounded-control w-full border p-2 font-mono"
              />
              <span className="text-12 text-text-faint block">
                One record at a time. Amino acids only — a nucleotide sequence is refused rather
                than numbered.
              </span>
            </label>
            {error ? <InlineError message={error.message} remedy={error.remedy} /> : null}
            <Button type="submit" variant="primary" disabled={pending || !text.trim()}>
              {pending ? 'Loading…' : 'Load target'}
            </Button>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  )
}
