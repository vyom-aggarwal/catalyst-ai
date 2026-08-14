import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { Badge, StatusDot } from '@/components/ui/badge'
import { Button, IconButton } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select } from '@/components/ui/select'
import { EmptyCell, Table, TableBody, TableCell, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ToastProvider, useToast } from '@/components/ui/toast'
import { Tooltip, TooltipProvider } from '@/components/ui/tooltip'

describe('Button', () => {
  it('defaults to type=button so a toolbar button never submits a form', () => {
    render(<Button>Start design run</Button>)
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button')
  })

  it('keeps an explicit type when one is given', () => {
    render(<Button type="submit">Confirm parse</Button>)
    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit')
  })

  it('merges conflicting classes so the last one wins', () => {
    render(<Button className="bg-surface-sunk">Cancel</Button>)
    // Split into tokens: a substring match would see `bg-surface` inside
    // `bg-surface-sunk` and pass for the wrong reason.
    const classes = screen.getByRole('button').className.split(/\s+/)
    expect(classes).toContain('bg-surface-sunk')
    expect(classes).not.toContain('bg-surface')
  })
})

describe('IconButton', () => {
  it('always has an accessible name, because icon-only buttons without one are banned', async () => {
    render(
      <TooltipProvider>
        <IconButton label="Column visibility" icon={<svg />} />
      </TooltipProvider>,
    )
    expect(screen.getByRole('button', { name: 'Column visibility' })).toBeInTheDocument()
  })
})

describe('Badge', () => {
  it('renders mutation codes in the mono face', () => {
    render(
      <Badge mono tone="accent">
        A123V
      </Badge>,
    )
    expect(screen.getByText('A123V').className).toContain('font-mono')
  })

  it('exposes a warn tone for mock-produced numbers', () => {
    render(<Badge tone="warn">Demo</Badge>)
    expect(screen.getByText('Demo').className).toContain('text-warn')
  })

  it('is the only component using rounded-full', () => {
    const { container } = render(<StatusDot tone="positive" />)
    expect(container.firstElementChild?.className).toContain('rounded-full')
  })
})

describe('Table', () => {
  it('right-aligns numeric cells and gives them tabular figures', () => {
    render(
      <Table>
        <TableBody>
          <TableRow>
            <TableCell numeric>1.42</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    )
    const cell = screen.getByText('1.42')
    expect(cell.className).toContain('text-right')
    expect(cell.className).toContain('tabular-nums')
  })

  it('marks selected rows for the accent treatment', () => {
    render(
      <Table>
        <TableBody>
          <TableRow selected data-testid="row">
            <TableCell>A123V</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    )
    expect(screen.getByTestId('row')).toHaveAttribute('data-selected', 'true')
  })

  it('renders a missing value as a dash that explains itself, never as a zero', () => {
    render(<EmptyCell reason="ESM is unavailable for sequences over 1024 residues." />)
    const cell = screen.getByText('—')
    expect(cell).toHaveAttribute('title', 'ESM is unavailable for sequences over 1024 residues.')
  })
})

describe('Input', () => {
  it('flags invalid state to assistive technology', () => {
    render(<Input invalid aria-label="Accession" />)
    expect(screen.getByLabelText('Accession')).toHaveAttribute('aria-invalid', 'true')
  })

  it('renders sequences in the mono face', () => {
    render(<Input mono aria-label="Sequence" />)
    expect(screen.getByLabelText('Sequence').className).toContain('font-mono')
  })
})

describe('Select', () => {
  it('renders a trigger labelled for assistive technology', () => {
    render(
      <Select
        aria-label="Numbering scheme"
        options={[
          { value: 'uniprot', label: 'UniProt' },
          { value: 'pdb', label: 'PDB author' },
        ]}
      />,
    )
    expect(screen.getByRole('combobox', { name: 'Numbering scheme' })).toBeInTheDocument()
  })
})

describe('Tabs', () => {
  it('switches panels on click', async () => {
    const user = userEvent.setup()
    render(
      <Tabs defaultValue="scores">
        <TabsList>
          <TabsTrigger value="scores">Scores</TabsTrigger>
          <TabsTrigger value="provenance">Provenance</TabsTrigger>
        </TabsList>
        <TabsContent value="scores">Score table</TabsContent>
        <TabsContent value="provenance">Run 4f2a</TabsContent>
      </Tabs>,
    )
    expect(screen.getByText('Score table')).toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: 'Provenance' }))
    expect(screen.getByText('Run 4f2a')).toBeInTheDocument()
  })
})

describe('Dialog', () => {
  it('opens with an accessible name and closes on Escape', async () => {
    const user = userEvent.setup()
    render(
      <Dialog>
        <DialogTrigger asChild>
          <Button>Open</Button>
        </DialogTrigger>
        <DialogContent title="Confirm objective">Body</DialogContent>
      </Dialog>,
    )
    await user.click(screen.getByRole('button', { name: 'Open' }))
    expect(screen.getByRole('dialog', { name: 'Confirm objective' })).toBeInTheDocument()
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })
})

describe('Popover', () => {
  it('opens on trigger activation', async () => {
    const user = userEvent.setup()
    render(
      <Popover>
        <PopoverTrigger asChild>
          <Button>Columns</Button>
        </PopoverTrigger>
        <PopoverContent>Column list</PopoverContent>
      </Popover>,
    )
    await user.click(screen.getByRole('button', { name: 'Columns' }))
    expect(await screen.findByText('Column list')).toBeInTheDocument()
  })
})

describe('Tooltip', () => {
  it('passes the child straight through when disabled', () => {
    render(
      <TooltipProvider>
        <Tooltip content="Never shown" disabled>
          <Button>Run</Button>
        </Tooltip>
      </TooltipProvider>,
    )
    expect(screen.getByRole('button', { name: 'Run' })).toBeInTheDocument()
  })
})

describe('Toast', () => {
  function Harness() {
    const toast = useToast()
    return <Button onClick={() => toast({ title: 'Design run started' })}>Start design run</Button>
  }

  it('names the effect of the button that caused it', async () => {
    const user = userEvent.setup()
    render(
      <ToastProvider>
        <Harness />
      </ToastProvider>,
    )
    await user.click(screen.getByRole('button', { name: 'Start design run' }))
    expect(await screen.findByText('Design run started')).toBeInTheDocument()
  })

  it('does not stack duplicates, because toast spam is banned', async () => {
    const user = userEvent.setup()
    render(
      <ToastProvider>
        <Harness />
      </ToastProvider>,
    )
    const button = screen.getByRole('button', { name: 'Start design run' })
    await user.click(button)
    await user.click(button)
    await user.click(button)
    expect(await screen.findAllByText('Design run started')).toHaveLength(1)
  })
})
